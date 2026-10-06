import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { gunzipSync, strFromU8 } from "fflate"
import { filterReferenceSchematic } from "../lib/evms/filter-reference-schematic"
import { drv8307EvmDefinition } from "../lib/generated/ti-evms/drv8307evm.generated"

type SourceComponentId = string
type SchematicComponentId = string
type SourceComponent = AnyCircuitElement & {
  name: string
  source_component_id: SourceComponentId
}
type SchematicComponent = AnyCircuitElement & {
  schematic_component_id: SchematicComponentId
  source_component_id: SourceComponentId
}
type SchematicText = AnyCircuitElement & {
  schematic_component_id: SchematicComponentId
  text: string
}

test("DRV8307 hall-interface removal removes component-owned text", async () => {
  const circuitJson = await readDrv8307Schematic()
  const removedComponentNames = new Set(
    drv8307EvmDefinition.components.flatMap((component) =>
      component.removableFeatureId === "hall-interface" ? [component.name] : [],
    ),
  )
  const jp5SourceComponent = circuitJson.find(
    (element): element is SourceComponent => isSourceComponent(element) && element.name === "JP5",
  )
  if (!jp5SourceComponent) throw new Error("Expected the DRV8307 schematic to contain JP5")
  const jp5SchematicComponent = circuitJson.find(
    (element): element is SchematicComponent =>
      isSchematicComponent(element) &&
      element.source_component_id === jp5SourceComponent.source_component_id,
  )
  if (!jp5SchematicComponent) {
    throw new Error("Expected JP5 to have a schematic component")
  }
  const jp5Text = circuitJson.filter(
    (element): element is SchematicText =>
      isSchematicText(element) &&
      element.schematic_component_id === jp5SchematicComponent.schematic_component_id,
  )

  expect(jp5Text.map((element) => element.text)).toEqual(["1", "2", "JP5", "Comment"])

  const filteredCircuitJson = filterReferenceSchematic({ circuitJson, removedComponentNames })

  expect(
    filteredCircuitJson.some(
      (element) =>
        "schematic_component_id" in element &&
        element.schematic_component_id === jp5SchematicComponent.schematic_component_id,
    ),
  ).toBe(false)
})

async function readDrv8307Schematic(): Promise<AnyCircuitElement[]> {
  const file = Bun.file(
    new URL("../lib/generated/ti-evms/drv8307evm.schematic.circuit.json.gz", import.meta.url),
  )
  return JSON.parse(
    strFromU8(gunzipSync(new Uint8Array(await file.arrayBuffer()))),
  ) as AnyCircuitElement[]
}

function isSourceComponent(element: AnyCircuitElement): element is SourceComponent {
  return (
    element.type === "source_component" &&
    typeof element.name === "string" &&
    typeof element.source_component_id === "string"
  )
}

function isSchematicComponent(element: AnyCircuitElement): element is SchematicComponent {
  return (
    element.type === "schematic_component" &&
    typeof element.schematic_component_id === "string" &&
    typeof element.source_component_id === "string"
  )
}

function isSchematicText(element: AnyCircuitElement): element is SchematicText {
  return (
    element.type === "schematic_text" &&
    typeof element.schematic_component_id === "string" &&
    typeof element.text === "string"
  )
}
