import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { gunzipSync, strFromU8 } from "fflate"
import { filterReferenceSchematic } from "../lib/evms/filter-reference-schematic"
import { drv8307EvmDefinition } from "../lib/generated/ti-evms/drv8307evm.generated"

test("DRV8307 minimal board removes disconnected power symbols", async () => {
  const file = Bun.file(
    new URL("../lib/generated/ti-evms/drv8307evm.schematic.circuit.json.gz", import.meta.url),
  )
  const circuitJson = JSON.parse(
    strFromU8(gunzipSync(new Uint8Array(await file.arrayBuffer()))),
  ) as AnyCircuitElement[]
  const removedComponentNames = new Set(
    drv8307EvmDefinition.components.flatMap((component) =>
      component.removableFeatureId ? [component.name] : [],
    ),
  )

  const filteredCircuitJson = filterReferenceSchematic({
    circuitJson,
    removedComponentNames,
  })
  const retainedNetLabelIds = new Set(
    filteredCircuitJson.flatMap((element) =>
      element.type === "schematic_net_label" ? [element.schematic_net_label_id] : [],
    ),
  )

  expect(retainedNetLabelIds).not.toContain("schematic_net_label_altium_901")
  expect(retainedNetLabelIds).not.toContain("schematic_net_label_altium_939")
  expect(retainedNetLabelIds).not.toContain("schematic_net_label_altium_2371")
  expect(retainedNetLabelIds).toContain("schematic_net_label_altium_900")
  expect(retainedNetLabelIds).toContain("schematic_net_label_altium_938")
  expect(retainedNetLabelIds).toContain("schematic_net_label_altium_3209")
})
