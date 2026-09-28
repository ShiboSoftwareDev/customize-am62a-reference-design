import type { AnyCircuitElement } from "circuit-json"

const scalarReferenceKeys = [
  "parent_source_group_id",
  "source_group_id",
  "source_component_id",
  "source_port_id",
  "source_trace_id",
  "schematic_component_id",
  "schematic_group_id",
  "schematic_element_id",
  "pcb_component_id",
  "pcb_group_id",
  "positioned_relative_to_pcb_group_id",
  "pcb_port_id",
  "pcb_trace_id",
] as const

const arrayReferenceKeys = ["connected_source_port_ids", "connectsTo"] as const
const containerIdArrayKeys = [
  "member_source_group_ids",
  "schematic_component_ids",
  "pcb_component_ids",
] as const

type CircuitElementRecord = Record<string, unknown> & { type: string; name?: string }

export function filterCircuitJsonByElementNames(params: {
  circuitJson: AnyCircuitElement[]
  excludedElementNames: string[]
}): AnyCircuitElement[] {
  if (params.excludedElementNames.length === 0) return params.circuitJson

  const excludedElementNames = new Set(params.excludedElementNames)
  const removedElements = new Set<CircuitElementRecord>()
  const removedIds = new Set<string>()
  const elements = params.circuitJson as CircuitElementRecord[]

  for (const element of elements) {
    if (element.name && excludedElementNames.has(element.name)) {
      markElementRemoved({ element, removedElements, removedIds })
    }
  }

  let circuitJsonChanged = true
  while (circuitJsonChanged) {
    circuitJsonChanged = false
    for (const element of elements) {
      if (removedElements.has(element) || !referencesRemovedId(element, removedIds)) continue
      markElementRemoved({ element, removedElements, removedIds })
      circuitJsonChanged = true
    }

    for (const element of elements) {
      if (
        removedElements.has(element) ||
        element.type !== "source_group" ||
        typeof element.parent_source_group_id !== "string" ||
        sourceGroupHasContents({ sourceGroup: element, elements, removedElements })
      ) {
        continue
      }
      markElementRemoved({ element, removedElements, removedIds })
      circuitJsonChanged = true
    }
  }

  return elements
    .filter((element) => !removedElements.has(element))
    .map((element) => removeStaleContainerIds({ element, removedIds })) as AnyCircuitElement[]
}

function sourceGroupHasContents(params: {
  sourceGroup: CircuitElementRecord
  elements: CircuitElementRecord[]
  removedElements: Set<CircuitElementRecord>
}): boolean {
  const sourceGroupId = params.sourceGroup.source_group_id
  return params.elements.some(
    (element) =>
      !params.removedElements.has(element) &&
      ((element.type === "source_component" && element.source_group_id === sourceGroupId) ||
        (element.type === "source_group" && element.parent_source_group_id === sourceGroupId)),
  )
}

function markElementRemoved(params: {
  element: CircuitElementRecord
  removedElements: Set<CircuitElementRecord>
  removedIds: Set<string>
}): void {
  params.removedElements.add(params.element)
  const primaryId = params.element[`${params.element.type}_id`]
  if (typeof primaryId === "string") params.removedIds.add(primaryId)
}

function referencesRemovedId(element: CircuitElementRecord, removedIds: Set<string>): boolean {
  for (const key of scalarReferenceKeys) {
    const value = element[key]
    if (typeof value === "string" && removedIds.has(value)) return true
  }
  for (const key of arrayReferenceKeys) {
    const value = element[key]
    if (Array.isArray(value) && value.some((id) => typeof id === "string" && removedIds.has(id))) {
      return true
    }
  }
  return false
}

function removeStaleContainerIds(params: {
  element: CircuitElementRecord
  removedIds: Set<string>
}): CircuitElementRecord {
  let nextElement = params.element
  for (const key of containerIdArrayKeys) {
    const value = nextElement[key]
    if (!Array.isArray(value)) continue
    const filteredValue = value.filter((id) => typeof id !== "string" || !params.removedIds.has(id))
    if (filteredValue.length !== value.length)
      nextElement = { ...nextElement, [key]: filteredValue }
  }
  return nextElement
}
