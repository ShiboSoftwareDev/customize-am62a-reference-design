import { AltiumNetRecord, AltiumPadRecord, type AltiumPcbDocument } from "altiumts"
import {
  getComponentPinKey,
  parseAllegroPadNetAssignments,
} from "./parse-allegro-pad-net-assignments"
import type { ComponentNameByRecordIndex, NetRecordIndex } from "./types"

type ComponentPinKey = string
type NetName = string

export function applyAllegroPadNetAssignments(params: {
  allegroAsciiExport: string
  componentNames: ComponentNameByRecordIndex
  pcbDocument: AltiumPcbDocument
}): number {
  const assignmentsByComponentPin = parseAllegroPadNetAssignments(params.allegroAsciiExport)
  const netRecordIndexByName = getNetRecordIndexByName(params.pcbDocument)
  const matchedComponentPins = new Set<ComponentPinKey>()
  let assignedPadCount = 0

  for (const padRecord of params.pcbDocument.records) {
    if (!(padRecord instanceof AltiumPadRecord)) continue
    const componentIndex = padRecord.componentIndex
    const pinName = padRecord.name
    const componentName =
      componentIndex === undefined ? undefined : params.componentNames.get(componentIndex)
    if (!componentName || !pinName) continue

    const componentPinKey = getComponentPinKey({ componentName, pinName })
    const assignment = assignmentsByComponentPin.get(componentPinKey)
    if (!assignment) continue
    const netRecordIndex = netRecordIndexByName.get(assignment.netName)
    if (netRecordIndex === undefined) {
      throw new Error(
        `Allegro ASCII export references PCB net ${assignment.netName}, which is absent from the Altium board`,
      )
    }

    padRecord.set("NET", String(netRecordIndex))
    matchedComponentPins.add(componentPinKey)
    assignedPadCount += 1
  }

  const unmatchedComponentPins = [...assignmentsByComponentPin.keys()].filter(
    (componentPinKey) => !matchedComponentPins.has(componentPinKey),
  )
  if (unmatchedComponentPins.length > 0) {
    throw new Error(
      `Allegro ASCII export has ${unmatchedComponentPins.length} component pins absent from the Altium board: ${unmatchedComponentPins.slice(0, 5).join(", ")}`,
    )
  }
  return assignedPadCount
}

function getNetRecordIndexByName(pcbDocument: AltiumPcbDocument): Map<NetName, NetRecordIndex> {
  const netRecordIndexByName = new Map<NetName, NetRecordIndex>()
  for (const [netRecordIndex, record] of pcbDocument.nets.entries()) {
    if (!(record instanceof AltiumNetRecord) || !record.name) continue
    if (netRecordIndexByName.has(record.name)) {
      throw new Error(`Altium board has duplicate PCB net ${record.name}`)
    }
    netRecordIndexByName.set(record.name, netRecordIndex)
  }
  return netRecordIndexByName
}
