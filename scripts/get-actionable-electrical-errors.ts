import type { AnyCircuitElement } from "circuit-json"

type SourceNetId = string
type SourceTraceId = string

type SourceTraceElement = AnyCircuitElement & {
  connected_source_net_ids: SourceNetId[]
  source_trace_id: SourceTraceId
  type: "source_trace"
}

export function getActionableElectricalErrors(params: {
  baselineImportedErrorSourceNetIds?: ReadonlySet<SourceNetId>
  circuitJson: AnyCircuitElement[]
  electricalErrors: AnyCircuitElement[]
}): AnyCircuitElement[] {
  const importedOrPouredSourceNetIds = getSourceNetIdsWithImportedCopper(params.circuitJson)
  for (const sourceNetId of params.baselineImportedErrorSourceNetIds ?? []) {
    importedOrPouredSourceNetIds.add(sourceNetId)
  }
  const sourceTracesById = new Map<SourceTraceId, SourceTraceElement>(
    params.circuitJson.filter(isSourceTrace).map((trace) => [trace.source_trace_id, trace]),
  )

  return params.electricalErrors.filter((electricalError) => {
    const sourceNetIds = getElectricalErrorSourceNetIds({ electricalError, sourceTracesById })
    if (sourceNetIds.length === 0) return true
    return !sourceNetIds.some((sourceNetId) => importedOrPouredSourceNetIds.has(sourceNetId))
  })
}

export function getImportedSourceNetIdsWithElectricalErrors(params: {
  circuitJson: AnyCircuitElement[]
  electricalErrors: AnyCircuitElement[]
}): Set<SourceNetId> {
  const importedSourceNetIds = getSourceNetIdsWithImportedCopper(params.circuitJson)
  const sourceTracesById = new Map<SourceTraceId, SourceTraceElement>(
    params.circuitJson.filter(isSourceTrace).map((trace) => [trace.source_trace_id, trace]),
  )
  return new Set(
    params.electricalErrors.flatMap((electricalError) =>
      getElectricalErrorSourceNetIds({ electricalError, sourceTracesById }).filter((sourceNetId) =>
        importedSourceNetIds.has(sourceNetId),
      ),
    ),
  )
}

export function getSourceNetIdsWithImportedCopper(
  circuitJson: AnyCircuitElement[],
): Set<SourceNetId> {
  const sourceNetIds = new Set<SourceNetId>()
  const sourceTracesById = new Map<SourceTraceId, SourceTraceElement>(
    circuitJson.filter(isSourceTrace).map((trace) => [trace.source_trace_id, trace]),
  )
  for (const element of circuitJson) {
    if (element.type === "pcb_trace" && typeof element.source_trace_id === "string") {
      if (element.source_trace_id.startsWith("source_net_")) {
        sourceNetIds.add(element.source_trace_id)
      } else {
        for (const sourceNetId of sourceTracesById.get(element.source_trace_id)
          ?.connected_source_net_ids ?? []) {
          sourceNetIds.add(sourceNetId)
        }
      }
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

function getElectricalErrorSourceNetIds(params: {
  electricalError: AnyCircuitElement
  sourceTracesById: ReadonlyMap<SourceTraceId, SourceTraceElement>
}): SourceNetId[] {
  const sourceTraceId = getErrorSourceTraceId(params.electricalError)
  if (!sourceTraceId) return []
  return sourceTraceId.startsWith("source_net_")
    ? [sourceTraceId]
    : (params.sourceTracesById.get(sourceTraceId)?.connected_source_net_ids ?? [])
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
