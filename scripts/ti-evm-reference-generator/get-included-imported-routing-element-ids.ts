import { checkDanglingTraces } from "@tscircuit/checks"
import type { AnyCircuitElement } from "circuit-json"
import {
  getImportedRoutingBridgeVias,
  isBridgeViaRequired,
  type ImportedRoutingBridgeVia,
} from "./get-imported-routing-bridge-vias"
import type { SourceComponentId } from "./types"

export type DanglingEndpointKey = string
export type PcbTraceId = string
export type PcbViaId = string
type PcbComponentId = string
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

export function getBaselineDanglingEndpointKeys(
  circuitJson: AnyCircuitElement[],
): ReadonlySet<DanglingEndpointKey> {
  return new Set(
    checkDanglingTraces(circuitJson).map((error) =>
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

export function getIncludedImportedRoutingElementIds(params: {
  baselineDanglingEndpointKeys: ReadonlySet<DanglingEndpointKey>
  circuitJson: AnyCircuitElement[]
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

  while (true) {
    const includedPcbViaIds = getIncludedPcbViaIds({
      includedPcbTraceIds,
      pcbTraces: params.pcbTraces,
      pcbVias: params.pcbVias,
    })
    const circuitJsonWithIncludedRouting = getCircuitJsonWithIncludedRouting({
      circuitJson: circuitJsonWithoutRemovedComponents,
      bridgeVias,
      includedPcbTraceIds,
      includedPcbViaIds,
    })
    const newlyDanglingPcbTraceIds = new Set<PcbTraceId>(
      checkDanglingTraces(circuitJsonWithIncludedRouting).flatMap((error) => {
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
  }
}

function getIncludedPcbViaIds(params: {
  includedPcbTraceIds: ReadonlySet<PcbTraceId>
  pcbTraces: ImportedPcbTrace[]
  pcbVias: ImportedPcbVia[]
}): Set<PcbViaId> {
  return new Set(
    params.pcbVias.flatMap((pcbVia) => {
      const incidentTraceIds = getIncidentPcbTraceIds({
        pcbTraceElements: params.pcbTraces,
        pcbVia,
      })
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

function getIncidentPcbTraceIds(params: {
  pcbTraceElements: ImportedPcbTrace[]
  pcbVia: ImportedPcbVia
}): Set<PcbTraceId> {
  return new Set(
    params.pcbTraceElements.flatMap((pcbTrace) =>
      pcbTrace.route.some((routePoint) => pointsAreEqual(routePoint, params.pcbVia))
        ? [pcbTrace.pcb_trace_id]
        : [],
    ),
  )
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

function pointsAreEqual(firstPoint: Point, secondPoint: Point): boolean {
  return (
    Math.abs(firstPoint.x - secondPoint.x) < 1e-6 && Math.abs(firstPoint.y - secondPoint.y) < 1e-6
  )
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
