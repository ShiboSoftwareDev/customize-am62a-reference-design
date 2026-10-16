import { checkDanglingTraces } from "@tscircuit/checks"
import { getPrimaryId } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement } from "circuit-json"
import type { ConnectivityMap } from "circuit-json-to-connectivity-map"
import {
  getImportedRoutingBridgeVias,
  type ImportedRoutingBridgeVia,
  isBridgeViaRequired,
} from "./get-imported-routing-bridge-vias"
import type { SourceComponentId } from "./types"

export type DanglingEndpointKey = string
export type PcbTraceId = string
export type PcbViaId = string
type PcbRoutePointKey = string
type PcbComponentId = string
type ConnectivityNetId = string
type SourceNetId = string
type SourceTraceId = string

type Point = {
  x: number
  y: number
}

type PcbComponentElement = AnyCircuitElement & {
  pcb_component_id: PcbComponentId
  source_component_id: SourceComponentId
  type: "pcb_component"
}

export type ImportedPcbTrace = AnyCircuitElement & {
  pcb_trace_id: PcbTraceId
  route: Array<Point & { layer?: string }>
  source_trace_id: SourceTraceId
  type: "pcb_trace"
}

export type ImportedPcbVia = AnyCircuitElement &
  Point & {
    hole_diameter?: number
    outer_diameter?: number
    pcb_via_id: PcbViaId
    source_net_id?: SourceNetId
    source_trace_id?: SourceTraceId
    type: "pcb_via"
  }

export type IncidentPcbTraceIdsByViaId = ReadonlyMap<PcbViaId, ReadonlySet<PcbTraceId>>

export function getBaselineDanglingEndpointKeys(
  circuitJson: AnyCircuitElement[],
  connectivityMap: ConnectivityMap,
): ReadonlySet<DanglingEndpointKey> {
  return new Set(
    checkDanglingTraces(circuitJson, { connMap: connectivityMap }).map((error) =>
      getDanglingEndpointKey({
        center: error.center,
        sourceTraceId: error.source_trace_id,
      }),
    ),
  )
}

export function getImportedPcbTraces(circuitJson: AnyCircuitElement[]): ImportedPcbTrace[] {
  return circuitJson.filter(isImportedPcbTrace)
}

export function getImportedPcbVias(circuitJson: AnyCircuitElement[]): ImportedPcbVia[] {
  return circuitJson.filter(isImportedPcbVia)
}

export function getIncidentPcbTraceIdsByViaId(params: {
  pcbTraces: ImportedPcbTrace[]
  pcbVias: ImportedPcbVia[]
}): IncidentPcbTraceIdsByViaId {
  const pcbTraceIdsByRoutePoint = new Map<PcbRoutePointKey, Set<PcbTraceId>>()
  for (const pcbTrace of params.pcbTraces) {
    for (const routePoint of pcbTrace.route) {
      const routePointKey = getRoutePointKey(routePoint)
      const pcbTraceIds = pcbTraceIdsByRoutePoint.get(routePointKey) ?? new Set<PcbTraceId>()
      pcbTraceIds.add(pcbTrace.pcb_trace_id)
      pcbTraceIdsByRoutePoint.set(routePointKey, pcbTraceIds)
    }
  }

  return new Map(
    params.pcbVias.map((pcbVia) => [
      pcbVia.pcb_via_id,
      pcbTraceIdsByRoutePoint.get(getRoutePointKey(pcbVia)) ?? new Set<PcbTraceId>(),
    ]),
  )
}

export function getIncludedImportedRoutingElementIds(params: {
  baselineDanglingEndpointKeys: ReadonlySet<DanglingEndpointKey>
  circuitJson: AnyCircuitElement[]
  connectivityMap: ConnectivityMap
  incidentPcbTraceIdsByViaId: IncidentPcbTraceIdsByViaId
  pcbTraces: ImportedPcbTrace[]
  pcbVias: ImportedPcbVia[]
  removedSourceComponentIds: ReadonlySet<SourceComponentId>
}): {
  includedBridgeVias: ImportedRoutingBridgeVia[]
  includedPcbTraceIds: ReadonlySet<PcbTraceId>
  includedPcbViaIds: ReadonlySet<PcbViaId>
} {
  const removedPcbComponentIds = new Set<PcbComponentId>(
    params.circuitJson.flatMap((element) =>
      isPcbComponent(element) && params.removedSourceComponentIds.has(element.source_component_id)
        ? [element.pcb_component_id]
        : [],
    ),
  )
  const circuitJsonWithoutRemovedComponents = params.circuitJson.filter(
    (element) =>
      !belongsToRemovedComponent({
        element,
        removedPcbComponentIds,
        removedSourceComponentIds: params.removedSourceComponentIds,
      }),
  )
  const includedPcbTraceIds = new Set<PcbTraceId>(
    params.pcbTraces.map(({ pcb_trace_id }) => pcb_trace_id),
  )
  const bridgeVias = getImportedRoutingBridgeVias({
    circuitJson: params.circuitJson,
    pcbTraces: params.pcbTraces,
    pcbVias: params.pcbVias,
    removedPcbComponentIds,
  })
  let pruningPassCount = 0
  let affectedNetIds: ReadonlySet<ConnectivityNetId> | undefined

  while (true) {
    pruningPassCount += 1
    const includedPcbViaIds = getIncludedPcbViaIds({
      includedPcbTraceIds,
      incidentPcbTraceIdsByViaId: params.incidentPcbTraceIdsByViaId,
      pcbVias: params.pcbVias,
    })
    const circuitJsonWithIncludedRouting = getCircuitJsonWithIncludedRouting({
      circuitJson: circuitJsonWithoutRemovedComponents,
      bridgeVias,
      includedPcbTraceIds,
      includedPcbViaIds,
    })
    const circuitJsonToCheck = affectedNetIds
      ? getCircuitJsonForConnectivityNets({
          circuitJson: circuitJsonWithIncludedRouting,
          connectivityMap: params.connectivityMap,
          netIds: affectedNetIds,
        })
      : circuitJsonWithIncludedRouting
    const newlyDanglingPcbTraceIds = new Set<PcbTraceId>(
      checkDanglingTraces(circuitJsonToCheck, {
        connMap: params.connectivityMap,
      }).flatMap((error) => {
        const danglingEndpointKey = getDanglingEndpointKey({
          center: error.center,
          sourceTraceId: error.source_trace_id,
        })
        return params.baselineDanglingEndpointKeys.has(danglingEndpointKey)
          ? []
          : [error.pcb_trace_id]
      }),
    )
    if (newlyDanglingPcbTraceIds.size === 0) {
      console.log(`Imported routing: completed after ${pruningPassCount} pruning passes`)
      return {
        includedBridgeVias: bridgeVias.filter((bridgeVia) =>
          isBridgeViaRequired({
            bridgeVia,
            includedPcbTraceIds,
            pcbTraces: params.pcbTraces,
          }),
        ),
        includedPcbTraceIds,
        includedPcbViaIds,
      }
    }
    for (const pcbTraceId of newlyDanglingPcbTraceIds) {
      includedPcbTraceIds.delete(pcbTraceId)
    }
    affectedNetIds = getConnectivityNetIdsForTraces({
      connectivityMap: params.connectivityMap,
      pcbTraceIds: newlyDanglingPcbTraceIds,
    })
  }
}

function getConnectivityNetIdsForTraces(params: {
  connectivityMap: ConnectivityMap
  pcbTraceIds: ReadonlySet<PcbTraceId>
}): ReadonlySet<ConnectivityNetId> | undefined {
  const netIds = new Set<ConnectivityNetId>()
  for (const pcbTraceId of params.pcbTraceIds) {
    const netId = params.connectivityMap.getNetConnectedToId(pcbTraceId)
    if (!netId) return undefined
    netIds.add(netId)
  }
  return netIds
}

function getCircuitJsonForConnectivityNets(params: {
  circuitJson: AnyCircuitElement[]
  connectivityMap: ConnectivityMap
  netIds: ReadonlySet<ConnectivityNetId>
}): AnyCircuitElement[] {
  return params.circuitJson.filter((element) => {
    if (element.type === "pcb_board") return true
    const primaryId = getPrimaryId(element)
    const sourceNetId =
      "source_net_id" in element && typeof element.source_net_id === "string"
        ? element.source_net_id
        : undefined
    const netId =
      (primaryId ? params.connectivityMap.getNetConnectedToId(primaryId) : undefined) ??
      (sourceNetId ? params.connectivityMap.getNetConnectedToId(sourceNetId) : undefined)
    return netId !== undefined && params.netIds.has(netId)
  })
}

function getIncludedPcbViaIds(params: {
  includedPcbTraceIds: ReadonlySet<PcbTraceId>
  incidentPcbTraceIdsByViaId: IncidentPcbTraceIdsByViaId
  pcbVias: ImportedPcbVia[]
}): Set<PcbViaId> {
  return new Set(
    params.pcbVias.flatMap((pcbVia) => {
      const incidentTraceIds =
        params.incidentPcbTraceIdsByViaId.get(pcbVia.pcb_via_id) ?? new Set<PcbTraceId>()
      return isPcbViaIncluded({
        incidentTraceIds,
        includedPcbTraceIds: params.includedPcbTraceIds,
      })
        ? [pcbVia.pcb_via_id]
        : []
    }),
  )
}

function isPcbViaIncluded(params: {
  incidentTraceIds: ReadonlySet<PcbTraceId>
  includedPcbTraceIds: ReadonlySet<PcbTraceId>
}): boolean {
  if (params.incidentTraceIds.size === 0) return true
  const includedIncidentTraceCount = [...params.incidentTraceIds].filter((pcbTraceId) =>
    params.includedPcbTraceIds.has(pcbTraceId),
  ).length
  const requiredIncidentTraceCount = Math.min(params.incidentTraceIds.size, 2)
  return includedIncidentTraceCount >= requiredIncidentTraceCount
}

function getCircuitJsonWithIncludedRouting(params: {
  bridgeVias: ImportedRoutingBridgeVia[]
  circuitJson: AnyCircuitElement[]
  includedPcbTraceIds: ReadonlySet<PcbTraceId>
  includedPcbViaIds: ReadonlySet<PcbViaId>
}): AnyCircuitElement[] {
  return [
    ...params.circuitJson.filter(
      (element) =>
        (!isImportedPcbTrace(element) || params.includedPcbTraceIds.has(element.pcb_trace_id)) &&
        (!isImportedPcbVia(element) || params.includedPcbViaIds.has(element.pcb_via_id)),
    ),
    ...params.bridgeVias.map(createBridgeViaCircuitElement),
  ]
}

function createBridgeViaCircuitElement(bridgeVia: ImportedRoutingBridgeVia): AnyCircuitElement {
  return {
    type: "pcb_via",
    pcb_via_id: bridgeVia.bridgeViaId,
    x: bridgeVia.x,
    y: bridgeVia.y,
    hole_diameter: bridgeVia.holeDiameter,
    outer_diameter: bridgeVia.outerDiameter,
    from_layer: "top",
    to_layer: "bottom",
    layers: ["top", "bottom"],
    source_net_id: bridgeVia.sourceNetId,
  }
}

function belongsToRemovedComponent(params: {
  element: AnyCircuitElement
  removedPcbComponentIds: ReadonlySet<PcbComponentId>
  removedSourceComponentIds: ReadonlySet<SourceComponentId>
}): boolean {
  const { element } = params
  return (
    ("source_component_id" in element &&
      typeof element.source_component_id === "string" &&
      params.removedSourceComponentIds.has(element.source_component_id)) ||
    ("pcb_component_id" in element &&
      typeof element.pcb_component_id === "string" &&
      params.removedPcbComponentIds.has(element.pcb_component_id))
  )
}

function getDanglingEndpointKey(params: {
  center: Point
  sourceTraceId: string
}): DanglingEndpointKey {
  return JSON.stringify([
    params.sourceTraceId,
    roundCoordinate(params.center.x),
    roundCoordinate(params.center.y),
  ])
}

function getRoutePointKey(point: Point): PcbRoutePointKey {
  return JSON.stringify([roundCoordinate(point.x), roundCoordinate(point.y)])
}

function roundCoordinate(coordinate: number): number {
  return Math.round(coordinate * 1e6) / 1e6
}

function isPcbComponent(element: AnyCircuitElement): element is PcbComponentElement {
  return (
    element.type === "pcb_component" &&
    typeof element.pcb_component_id === "string" &&
    typeof element.source_component_id === "string"
  )
}

function isImportedPcbTrace(element: AnyCircuitElement): element is ImportedPcbTrace {
  return (
    element.type === "pcb_trace" &&
    typeof element.pcb_trace_id === "string" &&
    typeof element.source_trace_id === "string" &&
    Array.isArray(element.route)
  )
}

function isImportedPcbVia(element: AnyCircuitElement): element is ImportedPcbVia {
  return (
    element.type === "pcb_via" &&
    typeof element.pcb_via_id === "string" &&
    typeof element.x === "number" &&
    typeof element.y === "number"
  )
}
