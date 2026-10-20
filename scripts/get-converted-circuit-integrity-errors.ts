import type { AnyCircuitElement } from "circuit-json"

type PcbComponentId = string
type PcbPortId = string
type SourceComponentId = string
type SourceNetId = string
type SourcePortId = string
type SourceTraceId = string

type PcbTraceRoutePoint = {
  end_pcb_port_id?: unknown
  start_pcb_port_id?: unknown
  x?: unknown
  y?: unknown
}

type PcbTraceElement = AnyCircuitElement & {
  pcb_trace_id: string
  route: PcbTraceRoutePoint[]
  source_trace_id?: string
  type: "pcb_trace"
}

type SourceTraceElement = AnyCircuitElement & {
  connected_source_net_ids: SourceNetId[]
  connected_source_port_ids: SourcePortId[]
  source_trace_id: SourceTraceId
  type: "source_trace"
}

const routingErrorTypes = new Set([
  "pcb_port_not_matched_error",
  "pcb_trace_error",
  "source_trace_not_connected_error",
])

export function getConvertedCircuitIntegrityErrors(circuitJson: AnyCircuitElement[]): string[] {
  const errors: string[] = []
  const sourceComponentIds = new Set<SourceComponentId>()
  const sourceNetIds = new Set<SourceNetId>()
  const sourcePortIds = new Set<SourcePortId>()
  const sourceTraces = new Map<SourceTraceId, SourceTraceElement>()
  const pcbComponentIds = new Set<PcbComponentId>()
  const pcbPortIds = new Set<PcbPortId>()

  for (const element of circuitJson) {
    if (element.type === "source_component" && typeof element.source_component_id === "string") {
      sourceComponentIds.add(element.source_component_id)
    } else if (
      element.type === "source_manually_placed_via" &&
      typeof element.source_manually_placed_via_id === "string"
    ) {
      sourceComponentIds.add(element.source_manually_placed_via_id)
    } else if (element.type === "source_net" && typeof element.source_net_id === "string") {
      sourceNetIds.add(element.source_net_id)
    } else if (element.type === "source_port" && typeof element.source_port_id === "string") {
      sourcePortIds.add(element.source_port_id)
    } else if (isSourceTrace(element)) {
      sourceTraces.set(element.source_trace_id, element)
    } else if (element.type === "pcb_component" && typeof element.pcb_component_id === "string") {
      pcbComponentIds.add(element.pcb_component_id)
    } else if (element.type === "pcb_port" && typeof element.pcb_port_id === "string") {
      pcbPortIds.add(element.pcb_port_id)
    }

    if (routingErrorTypes.has(element.type)) {
      errors.push(`${element.type}: ${"message" in element ? element.message : "routing error"}`)
    }
  }

  for (const element of circuitJson) {
    if (
      "source_component_id" in element &&
      typeof element.source_component_id === "string" &&
      element.type !== "source_component" &&
      !sourceComponentIds.has(element.source_component_id)
    ) {
      errors.push(
        `${element.type} references missing source component ${element.source_component_id}`,
      )
    }
    if (
      "pcb_component_id" in element &&
      typeof element.pcb_component_id === "string" &&
      element.type !== "pcb_component" &&
      !pcbComponentIds.has(element.pcb_component_id)
    ) {
      errors.push(`${element.type} references missing PCB component ${element.pcb_component_id}`)
    }
    if (
      element.type === "pcb_port" &&
      typeof element.source_port_id === "string" &&
      !sourcePortIds.has(element.source_port_id)
    ) {
      errors.push(`PCB port ${element.pcb_port_id} references missing source port`)
    }
    if (isPcbTrace(element)) {
      validatePcbTrace({ element, errors, pcbPortIds, sourceNetIds, sourceTraces })
    }
    if (
      element.type === "pcb_copper_pour" &&
      "source_net_id" in element &&
      typeof element.source_net_id === "string" &&
      !sourceNetIds.has(element.source_net_id)
    ) {
      errors.push(`PCB copper pour references missing source net ${element.source_net_id}`)
    }
  }

  for (const sourceTrace of sourceTraces.values()) {
    for (const sourcePortId of sourceTrace.connected_source_port_ids) {
      if (!sourcePortIds.has(sourcePortId)) {
        errors.push(`${sourceTrace.source_trace_id} references missing source port ${sourcePortId}`)
      }
    }
    for (const sourceNetId of sourceTrace.connected_source_net_ids) {
      if (!sourceNetIds.has(sourceNetId)) {
        errors.push(`${sourceTrace.source_trace_id} references missing source net ${sourceNetId}`)
      }
    }
  }

  return errors
}

function validatePcbTrace(params: {
  element: PcbTraceElement
  errors: string[]
  pcbPortIds: ReadonlySet<PcbPortId>
  sourceNetIds: ReadonlySet<SourceNetId>
  sourceTraces: ReadonlyMap<SourceTraceId, SourceTraceElement>
}): void {
  const { element } = params
  if (!Array.isArray(element.route) || element.route.length === 0) {
    params.errors.push(`PCB trace ${element.pcb_trace_id} has no route`)
    return
  }
  for (const routePoint of element.route) {
    if (
      typeof routePoint.x === "number" &&
      (!Number.isFinite(routePoint.x) || !Number.isFinite(routePoint.y))
    ) {
      params.errors.push(`PCB trace ${element.pcb_trace_id} has a non-finite route point`)
      break
    }
    for (const propertyName of ["start_pcb_port_id", "end_pcb_port_id"] as const) {
      const pcbPortId = routePoint[propertyName]
      if (typeof pcbPortId === "string" && !params.pcbPortIds.has(pcbPortId)) {
        params.errors.push(`PCB trace ${element.pcb_trace_id} references missing port ${pcbPortId}`)
      }
    }
  }
  if (
    typeof element.source_trace_id === "string" &&
    !params.sourceTraces.has(element.source_trace_id) &&
    !params.sourceNetIds.has(element.source_trace_id)
  ) {
    params.errors.push(
      `PCB trace ${element.pcb_trace_id} references missing source connection ${element.source_trace_id}`,
    )
  }
}

function isPcbTrace(element: AnyCircuitElement): element is PcbTraceElement {
  return (
    element.type === "pcb_trace" &&
    typeof element.pcb_trace_id === "string" &&
    Array.isArray(element.route)
  )
}

function isSourceTrace(element: AnyCircuitElement): element is SourceTraceElement {
  return (
    element.type === "source_trace" &&
    typeof element.source_trace_id === "string" &&
    Array.isArray(element.connected_source_port_ids) &&
    element.connected_source_port_ids.every((id) => typeof id === "string") &&
    Array.isArray(element.connected_source_net_ids) &&
    element.connected_source_net_ids.every((id) => typeof id === "string")
  )
}
