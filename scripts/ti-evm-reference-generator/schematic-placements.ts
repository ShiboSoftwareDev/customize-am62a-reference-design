import type { AltiumComponentRecord, AltiumPadRecord } from "altiumts"
import type { AnyCircuitElement } from "circuit-json"
import type { ReferenceSchematicPlacement } from "../../lib/evms/reference-evm-types"
import {
  isSchematicComponent,
  isSchematicPort,
  isSourceComponent,
  isSourcePort,
} from "./circuit-json-elements"
import { round } from "./geometry"
import { createPinKeys } from "./pads"
import type { ComponentRecordIndex, PinKey } from "./types"

type PositionedPin = { pinKey: PinKey; x: number; y: number }

export function createSchematicPlacements(params: {
  componentRecords: AltiumComponentRecord[]
  padRecords: AltiumPadRecord[]
  schematicCircuitJson: AnyCircuitElement[]
}): Map<ComponentRecordIndex, ReferenceSchematicPlacement> {
  const placements = new Map<ComponentRecordIndex, ReferenceSchematicPlacement>()
  const sourcePorts = new Map(
    params.schematicCircuitJson.filter(isSourcePort).map((port) => [port.source_port_id, port]),
  )
  const schematicPortsByComponent = Map.groupBy(
    params.schematicCircuitJson.filter(isSchematicPort),
    ({ schematic_component_id }) => schematic_component_id,
  )
  const schematicComponentsBySource = Map.groupBy(
    params.schematicCircuitJson.filter(isSchematicComponent),
    ({ source_component_id }) => source_component_id,
  )

  for (const [componentRecordIndex] of params.componentRecords.entries()) {
    const sourceComponent = params.schematicCircuitJson
      .filter(isSourceComponent)
      .find(({ name }) => name === params.componentRecords[componentRecordIndex].designator)
    if (!sourceComponent) continue
    const schematicComponents = schematicComponentsBySource.get(sourceComponent.source_component_id)
    if (!schematicComponents || schematicComponents.length === 0) continue
    const schematicComponent = schematicComponents[0]
    const componentPads = params.padRecords.filter(
      ({ componentIndex }) => componentIndex === componentRecordIndex,
    )
    const pinKeys = createPinKeys(componentPads)
    const sides: Record<"left" | "right" | "top" | "bottom", PositionedPin[]> = {
      left: [],
      right: [],
      top: [],
      bottom: [],
    }
    const assignedPins = new Set<PinKey>()
    for (const schematicPort of schematicPortsByComponent.get(
      schematicComponent.schematic_component_id,
    ) ?? []) {
      const sourcePort = sourcePorts.get(schematicPort.source_port_id)
      if (!sourcePort) continue
      const rawPinName = String(sourcePort.pin_number ?? sourcePort.name)
      const pinKey = pinKeys.get(rawPinName)
      if (!pinKey || assignedPins.has(pinKey)) continue
      sides[schematicPort.side_of_component].push({
        pinKey,
        x: schematicPort.center.x,
        y: schematicPort.center.y,
      })
      assignedPins.add(pinKey)
    }
    const unassignedPins = [...pinKeys.values()].filter((pinKey) => !assignedPins.has(pinKey))
    for (const [pinIndex, pinKey] of unassignedPins.entries()) {
      sides[pinIndex % 2 === 0 ? "left" : "right"].push({ pinKey, x: 0, y: -pinIndex })
    }
    sides.left.sort((first, second) => second.y - first.y)
    sides.right.sort((first, second) => second.y - first.y)
    sides.top.sort((first, second) => first.x - second.x)
    sides.bottom.sort((first, second) => first.x - second.x)
    placements.set(componentRecordIndex, {
      x: round(schematicComponent.center.x),
      y: round(schematicComponent.center.y),
      width: round(Math.max(1.2, schematicComponent.size.width)),
      height: round(Math.max(0.8, schematicComponent.size.height)),
      leftPins: sides.left.map(({ pinKey }) => pinKey),
      rightPins: sides.right.map(({ pinKey }) => pinKey),
      topPins: sides.top.map(({ pinKey }) => pinKey),
      bottomPins: sides.bottom.map(({ pinKey }) => pinKey),
    })
  }
  return placements
}
