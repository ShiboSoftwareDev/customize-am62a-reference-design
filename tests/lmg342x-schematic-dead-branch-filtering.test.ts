import { expect, test } from "bun:test"
import "bun-match-svg"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"
import { gunzipSync, strFromU8 } from "fflate"
import { filterReferenceSchematic } from "../lib/evms/filter-reference-schematic"
import { lmg342xBbEvmDefinition } from "../lib/generated/ti-evms/lmg342x-bb-evm.generated"

type SourceComponentId = string
type SourcePortId = string
type SchematicPortId = string
type SourceComponent = AnyCircuitElement & {
  name: string
  source_component_id: SourceComponentId
}
type SourcePort = AnyCircuitElement & {
  name: string
  source_component_id: SourceComponentId
  source_port_id: SourcePortId
}
type SchematicPort = AnyCircuitElement & {
  schematic_port_id: SchematicPortId
  source_port_id: SourcePortId
}
type SchematicTrace = AnyCircuitElement & {
  edges: Array<{
    from_schematic_port_id?: SchematicPortId
    to_schematic_port_id?: SchematicPortId
  }>
}

test("LMG342X minimal keeps retained PWM ports connected", async () => {
  const circuitJson = await readLmg342xSchematic()
  const removedComponentNames = new Set(
    lmg342xBbEvmDefinition.components.flatMap((component) =>
      component.removableFeatureId ? [component.name] : [],
    ),
  )
  const filteredCircuitJson = filterReferenceSchematic({
    circuitJson,
    removedComponentNames,
  })

  for (const port of [
    { componentName: "R2", portName: "2" },
    { componentName: "R4", portName: "2" },
    { componentName: "J3", portName: "1" },
    { componentName: "J8", portName: "1" },
  ]) {
    expectRetainedPortToHaveSchematicTrace({
      circuitJson: filteredCircuitJson,
      ...port,
    })
  }

  const schematicSvg = convertCircuitJsonToSchematicSvg(filteredCircuitJson, {
    includeVersion: false,
  }).replace(/[ \t]+$/gmu, "")
  await expect(schematicSvg).toMatchSvgSnapshot(import.meta.path)
})

async function readLmg342xSchematic(): Promise<AnyCircuitElement[]> {
  const file = Bun.file(
    new URL("../lib/generated/ti-evms/lmg342x-bb-evm.schematic.circuit.json.gz", import.meta.url),
  )
  return JSON.parse(
    strFromU8(gunzipSync(new Uint8Array(await file.arrayBuffer()))),
  ) as AnyCircuitElement[]
}

function expectRetainedPortToHaveSchematicTrace(params: {
  circuitJson: AnyCircuitElement[]
  componentName: string
  portName: string
}): void {
  const sourceComponent = params.circuitJson.find(
    (element): element is SourceComponent =>
      element.type === "source_component" && element.name === params.componentName,
  )
  expect(sourceComponent).toBeDefined()

  const sourcePort = params.circuitJson.find(
    (element): element is SourcePort =>
      element.type === "source_port" &&
      element.source_component_id === sourceComponent?.source_component_id &&
      element.name === params.portName,
  )
  expect(sourcePort).toBeDefined()

  const schematicPort = params.circuitJson.find(
    (element): element is SchematicPort =>
      element.type === "schematic_port" && element.source_port_id === sourcePort?.source_port_id,
  )
  expect(schematicPort).toBeDefined()

  const hasSchematicTrace = params.circuitJson.some(
    (element) =>
      isSchematicTrace(element) &&
      element.edges.some(
        (edge) =>
          edge.from_schematic_port_id === schematicPort?.schematic_port_id ||
          edge.to_schematic_port_id === schematicPort?.schematic_port_id,
      ),
  )
  expect(hasSchematicTrace).toBe(true)
}

function isSchematicTrace(element: AnyCircuitElement): element is SchematicTrace {
  return element.type === "schematic_trace" && Array.isArray(element.edges)
}
