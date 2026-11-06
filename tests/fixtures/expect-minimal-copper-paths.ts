import { expect } from "bun:test"
import { resolve } from "node:path"
import { parsePrebuiltCircuitJson } from "app/parse-prebuilt-circuit-json"
import {
  copperPolygonsTouch,
  getPlatedHolePolygon,
  getPourPolygon,
  getPrimaryId,
  getSmtPadPolygon,
  getTraceSegmentPolygon,
  getViaPolygon,
} from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement } from "circuit-json"
import { getFullConnectivityMapFromCircuitJson } from "circuit-json-to-connectivity-map"
import { getTiEvm, getTiEvmVariant, type TiEvmId } from "lib/ti-evm-catalog"

type NetName = string
type SourcePortId = string
type PcbPortId = string
type PcbLayerName = string
type PinName = string
type CopperPolygon = ReturnType<typeof getPourPolygon>
type Copper = { polygon: CopperPolygon; layers: PcbLayerName[]; pcbPortId?: PcbPortId }
type PcbVia = Parameters<typeof getViaPolygon>[0] & {
  outer_diameter: number
  hole_diameter: number
  layers: PcbLayerName[]
}
// Use nanometers for the geometry kernel so short edges in dense pours
// remain distinguishable from duplicate vertices.
const COPPER_GEOMETRY_SCALE = 1e6
const COPPER_CONTACT_TOLERANCE = 1e-7 * COPPER_GEOMETRY_SCALE

type WirePoint = Parameters<typeof getTraceSegmentPolygon>[0] & {
  route_type: "wire"
  layer: PcbLayerName
  width: number
}

export async function expectMinimalCopperPaths({
  evmId,
  connectedPinsByNetName,
}: {
  evmId: TiEvmId
  connectedPinsByNetName: Record<NetName, [PinName, PinName, ...PinName[]]>
}) {
  const { circuitJsonUrl } = getTiEvmVariant(getTiEvm(evmId), "minimal-board")
  const circuitJson = parsePrebuiltCircuitJson(
    await Bun.file(resolve(import.meta.dir, "../../public", `.${circuitJsonUrl}`)).bytes(),
  )
  const connectivity = getFullConnectivityMapFromCircuitJson(circuitJson)
  const pcbPortIdBySourcePortId = new Map<SourcePortId, PcbPortId>(
    circuitJson.flatMap((element) =>
      element.type === "pcb_port" &&
      typeof element.source_port_id === "string" &&
      typeof element.pcb_port_id === "string"
        ? [[element.source_port_id, element.pcb_port_id]]
        : [],
    ),
  )

  for (const [netName, connectedPins] of Object.entries(connectedPinsByNetName)) {
    const net = circuitJson.find(
      (element) => element.type === "source_net" && element.name === netName,
    )
    if (typeof net?.source_net_id !== "string") throw new Error(`Missing ${netName}`)
    const netId = connectivity.getNetConnectedToId(net.source_net_id)
    if (!netId) throw new Error(`Missing connectivity for ${netName}`)
    const copper = circuitJson.flatMap((element) => {
      const id = element.type === "pcb_copper_pour" ? element.source_net_id : getPrimaryId(element)
      return typeof id === "string" && connectivity.getNetConnectedToId(id) === netId
        ? getCopper(element)
        : []
    })
    const pcbPortIds = connectedPins.map((pinName) => {
      const sourcePortId = getSourcePortId({ circuitJson, pinName })
      const pcbPortId = pcbPortIdBySourcePortId.get(sourcePortId)
      if (!pcbPortId) throw new Error(`Missing PCB port for ${pinName}`)
      return pcbPortId
    })
    const connectedPortIds = getConnectedPortIds({ copper, startPortId: pcbPortIds[0] })
    for (const [index, pcbPortId] of pcbPortIds.entries()) {
      expect(
        connectedPortIds.has(pcbPortId),
        `${netName}: ${connectedPins[0]} to ${connectedPins[index]}`,
      ).toBe(true)
    }
  }
}

function getSourcePortId({
  circuitJson,
  pinName,
}: {
  circuitJson: AnyCircuitElement[]
  pinName: PinName
}): SourcePortId {
  const [designator, name] = pinName.split(".")
  const component = circuitJson.find(
    (element) => element.type === "source_component" && element.name === designator,
  )
  const port = circuitJson.find(
    (element) =>
      element.type === "source_port" &&
      element.source_component_id === component?.source_component_id &&
      element.name === name,
  )
  if (!component || typeof port?.source_port_id !== "string") throw new Error(`Missing ${pinName}`)
  return port.source_port_id
}

function getCopper(element: AnyCircuitElement): Copper[] {
  switch (element.type) {
    case "pcb_copper_pour": {
      const pour = element as Parameters<typeof getPourPolygon>[0]
      return [{ polygon: getPourPolygon(pour), layers: [pour.layer] }]
    }
    case "pcb_via": {
      const via = element as PcbVia
      return [
        { polygon: getViaPolygon(via, via.outer_diameter, via.hole_diameter), layers: via.layers },
      ]
    }
    case "pcb_smtpad": {
      const pad = element as Parameters<typeof getSmtPadPolygon>[0]
      return [{ polygon: getSmtPadPolygon(pad), layers: [pad.layer], pcbPortId: pad.pcb_port_id }]
    }
    case "pcb_plated_hole": {
      const pad = element as Parameters<typeof getPlatedHolePolygon>[0]
      return [
        { polygon: getPlatedHolePolygon(pad), layers: pad.layers, pcbPortId: pad.pcb_port_id },
      ]
    }
    case "pcb_trace": {
      const route = element.route as Array<WirePoint | { route_type: "via" | "jumper" }>
      return route.flatMap((start, index) => {
        const end = route[index + 1]
        if (start.route_type !== "wire" || end?.route_type !== "wire" || start.layer !== end.layer)
          return []
        const endWidth = element.route_thickness_mode === "interpolated" ? end.width : start.width
        return [
          {
            polygon: getTraceSegmentPolygon(start, end, start.width, endWidth),
            layers: [start.layer],
          },
        ]
      })
    }
    default:
      return []
  }
}

function getConnectedPortIds({
  copper,
  startPortId,
}: {
  copper: Copper[]
  startPortId: PcbPortId
}): ReadonlySet<PcbPortId> {
  const remaining = new Set(
    copper
      .filter(({ polygon }) => !polygon.isEmpty())
      .map((conductor) => {
        const polygon = conductor.polygon.scale(COPPER_GEOMETRY_SCALE, COPPER_GEOMETRY_SCALE)
        return { ...conductor, polygon, bounds: polygon.box }
      }),
  )
  const connectedPortIds = new Set<PcbPortId>()
  const queue = [...remaining].filter(({ pcbPortId }) => pcbPortId === startPortId)
  for (const conductor of queue) remaining.delete(conductor)
  for (const conductor of queue) {
    if (conductor.pcbPortId) connectedPortIds.add(conductor.pcbPortId)
    for (const candidate of remaining) {
      if (
        conductor.bounds.intersect(candidate.bounds) &&
        conductor.layers.some((layer) => candidate.layers.includes(layer)) &&
        copperPolygonsTouch(conductor.polygon, candidate.polygon, COPPER_CONTACT_TOLERANCE)
      ) {
        remaining.delete(candidate)
        queue.push(candidate)
      }
    }
  }
  return connectedPortIds
}
