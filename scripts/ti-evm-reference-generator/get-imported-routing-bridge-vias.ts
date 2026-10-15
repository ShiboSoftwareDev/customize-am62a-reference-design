import type { AnyCircuitElement } from "circuit-json"
import type {
  ImportedPcbTrace,
  ImportedPcbVia,
  PcbTraceId,
} from "./get-included-imported-routing-element-ids"

type PcbComponentId = string
type PcbPortId = string
type SourceNetId = string
type SourceTraceId = string

type Point = {
  x: number
  y: number
}

type PcbPortElement = AnyCircuitElement &
  Point & {
    layers: string[]
    pcb_component_id: PcbComponentId
    pcb_port_id: PcbPortId
    type: "pcb_port"
  }

export type ImportedRoutingBridgeVia = Point & {
  bridgeViaId: string
  holeDiameter: number
  outerDiameter: number
  sourceNetId: SourceNetId
}

export function getImportedRoutingBridgeVias(params: {
  circuitJson: AnyCircuitElement[]
  pcbTraces: ImportedPcbTrace[]
  pcbVias: ImportedPcbVia[]
  removedPcbComponentIds: ReadonlySet<PcbComponentId>
}): ImportedRoutingBridgeVia[] {
  const sourceNetIdBySourceTraceId = getSourceNetIdBySourceTraceId(params.circuitJson)
  const referenceViaBySourceNetId = getReferenceViaBySourceNetId({
    pcbVias: params.pcbVias,
    sourceNetIdBySourceTraceId,
  })

  return params.circuitJson.filter(isPcbPort).flatMap((pcbPort) => {
    if (!isRemovedMultilayerPcbPort({ pcbPort, ...params })) return []
    const incidentTraces = params.pcbTraces.filter((pcbTrace) =>
      pcbTrace.route.some((routePoint) => pointsAreEqual(routePoint, pcbPort)),
    )
    const sourceNetId = getSingleSourceNetId({ incidentTraces, sourceNetIdBySourceTraceId })
    if (!sourceNetId || getIncidentLayerCount({ incidentTraces, point: pcbPort }) < 2) return []
    const referenceVia = referenceViaBySourceNetId.get(sourceNetId)
    if (
      typeof referenceVia?.hole_diameter !== "number" ||
      typeof referenceVia.outer_diameter !== "number"
    ) {
      return []
    }
    return [
      {
        bridgeViaId: `removed-pcb-port:${pcbPort.pcb_port_id}`,
        holeDiameter: referenceVia.hole_diameter,
        outerDiameter: referenceVia.outer_diameter,
        sourceNetId,
        x: pcbPort.x,
        y: pcbPort.y,
      },
    ]
  })
}

export function isBridgeViaRequired(params: {
  bridgeVia: ImportedRoutingBridgeVia
  includedPcbTraceIds: ReadonlySet<PcbTraceId>
  pcbTraces: ImportedPcbTrace[]
}): boolean {
  const includedTraces = params.pcbTraces.filter((pcbTrace) =>
    params.includedPcbTraceIds.has(pcbTrace.pcb_trace_id),
  )
  return getIncidentLayerCount({ incidentTraces: includedTraces, point: params.bridgeVia }) >= 2
}

function getSourceNetIdBySourceTraceId(
  circuitJson: AnyCircuitElement[],
): Map<SourceTraceId, SourceNetId> {
  return new Map(
    circuitJson.flatMap((element) => {
      if (
        element.type !== "source_trace" ||
        typeof element.source_trace_id !== "string" ||
        !Array.isArray(element.connected_source_net_ids) ||
        typeof element.connected_source_net_ids[0] !== "string"
      ) {
        return []
      }
      return [[element.source_trace_id, element.connected_source_net_ids[0]]]
    }),
  )
}

function getReferenceViaBySourceNetId(params: {
  pcbVias: ImportedPcbVia[]
  sourceNetIdBySourceTraceId: ReadonlyMap<SourceTraceId, SourceNetId>
}): Map<SourceNetId, ImportedPcbVia> {
  const referenceViaBySourceNetId = new Map<SourceNetId, ImportedPcbVia>()
  for (const pcbVia of params.pcbVias) {
    const sourceNetId = getPcbViaSourceNetId({
      pcbVia,
      sourceNetIdBySourceTraceId: params.sourceNetIdBySourceTraceId,
    })
    if (sourceNetId && !referenceViaBySourceNetId.has(sourceNetId)) {
      referenceViaBySourceNetId.set(sourceNetId, pcbVia)
    }
  }
  return referenceViaBySourceNetId
}

function getSingleSourceNetId(params: {
  incidentTraces: ImportedPcbTrace[]
  sourceNetIdBySourceTraceId: ReadonlyMap<SourceTraceId, SourceNetId>
}): SourceNetId | undefined {
  const sourceNetIds = new Set(
    params.incidentTraces.flatMap((pcbTrace) => {
      const sourceNetId = pcbTrace.source_trace_id.startsWith("source_net_")
        ? pcbTrace.source_trace_id
        : params.sourceNetIdBySourceTraceId.get(pcbTrace.source_trace_id)
      return sourceNetId ? [sourceNetId] : []
    }),
  )
  return sourceNetIds.size === 1 ? [...sourceNetIds][0] : undefined
}

function getIncidentLayerCount(params: {
  incidentTraces: ImportedPcbTrace[]
  point: Point
}): number {
  return new Set(
    params.incidentTraces.flatMap((pcbTrace) =>
      pcbTrace.route.flatMap((routePoint) =>
        pointsAreEqual(routePoint, params.point) && routePoint.layer ? [routePoint.layer] : [],
      ),
    ),
  ).size
}

function getPcbViaSourceNetId(params: {
  pcbVia: ImportedPcbVia
  sourceNetIdBySourceTraceId: ReadonlyMap<SourceTraceId, SourceNetId>
}): SourceNetId | undefined {
  if (params.pcbVia.source_net_id) return params.pcbVia.source_net_id
  return params.pcbVia.source_trace_id
    ? params.sourceNetIdBySourceTraceId.get(params.pcbVia.source_trace_id)
    : undefined
}

function isRemovedMultilayerPcbPort(params: {
  pcbPort: PcbPortElement
  removedPcbComponentIds: ReadonlySet<PcbComponentId>
}): boolean {
  return (
    params.removedPcbComponentIds.has(params.pcbPort.pcb_component_id) &&
    params.pcbPort.layers.includes("top") &&
    params.pcbPort.layers.includes("bottom")
  )
}

function pointsAreEqual(firstPoint: Point, secondPoint: Point): boolean {
  return (
    Math.abs(firstPoint.x - secondPoint.x) < 1e-6 && Math.abs(firstPoint.y - secondPoint.y) < 1e-6
  )
}

function isPcbPort(element: AnyCircuitElement): element is PcbPortElement {
  return (
    element.type === "pcb_port" &&
    typeof element.pcb_component_id === "string" &&
    typeof element.pcb_port_id === "string" &&
    typeof element.x === "number" &&
    typeof element.y === "number" &&
    Array.isArray(element.layers)
  )
}
