import type { AnyCircuitElement } from "circuit-json"

type SourceNetId = string
type SourceTraceId = string

type SourceTraceElement = AnyCircuitElement & {
  connected_source_net_ids: SourceNetId[]
  source_trace_id: SourceTraceId
  type: "source_trace"
}

export function getActionableElectricalErrors(params: {
  circuitJson: AnyCircuitElement[]
  electricalErrors: AnyCircuitElement[]
}): AnyCircuitElement[] {
  const importedOrPouredSourceNetIds = getImportedOrPouredSourceNetIds(params.circuitJson)
  const sourceTracesById = new Map<SourceTraceId, SourceTraceElement>(
    params.circuitJson.filter(isSourceTrace).map((trace) => [trace.source_trace_id, trace]),
  )

  return params.electricalErrors.filter((electricalError) => {
    const sourceTraceId = getErrorSourceTraceId(electricalError)
    if (!sourceTraceId) return true
    const sourceNetIds = sourceTraceId.startsWith("source_net_")
      ? [sourceTraceId]
      : (sourceTracesById.get(sourceTraceId)?.connected_source_net_ids ?? [])
    return !sourceNetIds.some((sourceNetId) => importedOrPouredSourceNetIds.has(sourceNetId))
  })
}

function getImportedOrPouredSourceNetIds(circuitJson: AnyCircuitElement[]): Set<SourceNetId> {
  const sourceNetIds = new Set<SourceNetId>()
  for (const element of circuitJson) {
    if (
      element.type === "pcb_trace" &&
      typeof element.source_trace_id === "string" &&
      element.source_trace_id.startsWith("source_net_")
    ) {
      sourceNetIds.add(element.source_trace_id)
    }
    if (
      element.type === "pcb_copper_pour" &&
      "source_net_id" in element &&
      typeof element.source_net_id === "string"
    ) {
      sourceNetIds.add(element.source_net_id)
    }
  }
  return sourceNetIds
}

function getErrorSourceTraceId(error: AnyCircuitElement): SourceTraceId | undefined {
  if ("source_trace_id" in error && typeof error.source_trace_id === "string") {
    return error.source_trace_id
  }
  for (const [propertyName, propertyValue] of Object.entries(error)) {
    if (!propertyName.endsWith("_error_id") || typeof propertyValue !== "string") continue
    const sourceTraceId = /_trace_(source_trace_[A-Za-z0-9_-]+)$/u.exec(propertyValue)?.[1]
    if (sourceTraceId) return sourceTraceId
  }
  return undefined
}

function isSourceTrace(element: AnyCircuitElement): element is SourceTraceElement {
  return (
    element.type === "source_trace" &&
    typeof element.source_trace_id === "string" &&
    Array.isArray(element.connected_source_net_ids)
  )
}
