import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { gunzipSync, strFromU8 } from "fflate"
import { filterReferenceSchematic } from "../lib/evms/filter-reference-schematic"
import { lmg342xBbEvmDefinition } from "../lib/generated/ti-evms/lmg342x-bb-evm.generated"

type SchematicPointKey = string
type SchematicTraceId = string
type SchematicTraceEndpointKey = string
type SourceTrace = AnyCircuitElement & {
  connected_source_port_ids: string[]
  source_trace_id: string
}
type SchematicTrace = AnyCircuitElement & {
  edges: Array<{
    from: { x: number; y: number }
    from_schematic_port_id?: string
    to: { x: number; y: number }
    to_schematic_port_id?: string
  }>
  schematic_trace_id: SchematicTraceId
  source_trace_id?: string
}
type SchematicNetLabel = AnyCircuitElement & {
  anchor_position?: { x: number; y: number }
  center: { x: number; y: number }
  schematic_trace_id?: SchematicTraceId
}

test("LMG342X measurement removal does not create dead schematic branches", async () => {
  const circuitJson = await readLmg342xSchematic()
  const removedComponentNames = new Set(
    lmg342xBbEvmDefinition.components.flatMap((component) =>
      component.removableFeatureId === "measurement-interface" ? [component.name] : [],
    ),
  )
  const filteredCircuitJson = filterReferenceSchematic({
    circuitJson,
    removedComponentNames,
  })
  const originalUnanchoredEndpoints = getUnanchoredEndpointKeys(circuitJson)
  const newUnanchoredEndpoints = [...getUnanchoredEndpointKeys(filteredCircuitJson)].filter(
    (pointKey) => !originalUnanchoredEndpoints.has(pointKey),
  )

  expect(newUnanchoredEndpoints).toEqual([])
})

async function readLmg342xSchematic(): Promise<AnyCircuitElement[]> {
  const file = Bun.file(
    new URL("../lib/generated/ti-evms/lmg342x-bb-evm.schematic.circuit.json.gz", import.meta.url),
  )
  return JSON.parse(
    strFromU8(gunzipSync(new Uint8Array(await file.arrayBuffer()))),
  ) as AnyCircuitElement[]
}

function getUnanchoredEndpointKeys(
  circuitJson: AnyCircuitElement[],
): Set<SchematicTraceEndpointKey> {
  const sourceTraceIdsWithMultiplePorts = new Set(
    circuitJson.flatMap((element) =>
      isSourceTrace(element) && element.connected_source_port_ids.length >= 2
        ? [element.source_trace_id]
        : [],
    ),
  )
  const netLabelPointKeysByTraceId = new Map<SchematicTraceId, Set<SchematicPointKey>>()
  for (const element of circuitJson) {
    if (!isSchematicNetLabel(element) || !element.schematic_trace_id) continue
    const pointKeys =
      netLabelPointKeysByTraceId.get(element.schematic_trace_id) ?? new Set<SchematicPointKey>()
    pointKeys.add(getSchematicPointKey(element.anchor_position ?? element.center))
    netLabelPointKeysByTraceId.set(element.schematic_trace_id, pointKeys)
  }

  return new Set(
    circuitJson.flatMap((element) => {
      if (
        !isSchematicTrace(element) ||
        !element.source_trace_id ||
        !sourceTraceIdsWithMultiplePorts.has(element.source_trace_id)
      ) {
        return []
      }
      const connectedEdgeCounts = new Map<SchematicPointKey, number>()
      const anchoredPointKeys = new Set(
        netLabelPointKeysByTraceId.get(element.schematic_trace_id) ?? [],
      )
      for (const edge of element.edges) {
        const fromKey = getSchematicPointKey(edge.from)
        const toKey = getSchematicPointKey(edge.to)
        connectedEdgeCounts.set(fromKey, (connectedEdgeCounts.get(fromKey) ?? 0) + 1)
        connectedEdgeCounts.set(toKey, (connectedEdgeCounts.get(toKey) ?? 0) + 1)
        if (edge.from_schematic_port_id) anchoredPointKeys.add(fromKey)
        if (edge.to_schematic_port_id) anchoredPointKeys.add(toKey)
      }
      return [...connectedEdgeCounts.entries()].flatMap(([pointKey, edgeCount]) =>
        edgeCount === 1 && !anchoredPointKeys.has(pointKey)
          ? [`${element.schematic_trace_id}:${pointKey}`]
          : [],
      )
    }),
  )
}

function getSchematicPointKey(point: { x: number; y: number }): SchematicPointKey {
  return `${point.x},${point.y}`
}

function isSchematicTrace(element: AnyCircuitElement): element is SchematicTrace {
  return (
    element.type === "schematic_trace" &&
    typeof element.schematic_trace_id === "string" &&
    Array.isArray(element.edges)
  )
}

function isSourceTrace(element: AnyCircuitElement): element is SourceTrace {
  return (
    element.type === "source_trace" &&
    typeof element.source_trace_id === "string" &&
    Array.isArray(element.connected_source_port_ids)
  )
}

function isSchematicNetLabel(element: AnyCircuitElement): element is SchematicNetLabel {
  return (
    element.type === "schematic_net_label" &&
    typeof element.center === "object" &&
    element.center !== null
  )
}
