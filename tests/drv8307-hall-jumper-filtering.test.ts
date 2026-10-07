import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { gunzipSync, strFromU8 } from "fflate"
import { filterReferenceSchematic } from "../lib/evms/filter-reference-schematic"
import { drv8307EvmDefinition } from "../lib/generated/ti-evms/drv8307evm.generated"

test("DRV8307 hall-interface removal removes JP4 and its ground symbol", async () => {
  const file = Bun.file(
    new URL("../lib/generated/ti-evms/drv8307evm.schematic.circuit.json.gz", import.meta.url),
  )
  const circuitJson = JSON.parse(
    strFromU8(gunzipSync(new Uint8Array(await file.arrayBuffer()))),
  ) as AnyCircuitElement[]
  const removedComponentNames = new Set(
    drv8307EvmDefinition.components.flatMap((component) =>
      component.removableFeatureId === "hall-interface" ? [component.name] : [],
    ),
  )
  const filteredCircuitJson = filterReferenceSchematic({
    circuitJson,
    removedComponentNames,
  })

  expect(removedComponentNames).toContain("JP4")
  expect(filteredCircuitJson).not.toContainEqual(
    expect.objectContaining({
      source_component_id: "source_component_altium_2494",
    }),
  )
  expect(filteredCircuitJson).not.toContainEqual(
    expect.objectContaining({
      schematic_net_label_id: "schematic_net_label_altium_2517",
    }),
  )
})
