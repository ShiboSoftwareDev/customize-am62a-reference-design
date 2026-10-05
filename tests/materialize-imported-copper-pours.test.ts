import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { materializeImportedCopperPours } from "../scripts/ti-evm-reference-generator/materialize-imported-copper-pours"

test("materializes imported copper pours with rendered net ids", () => {
  const sourceCircuitJson = [
    {
      type: "source_net",
      source_net_id: "source_net_imported",
      name: "GND",
      member_source_group_ids: [],
    },
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pcb_copper_pour_imported",
      source_net_id: "source_net_imported",
      layer: "top",
      covered_with_solder_mask: true,
      shape: "polygon",
      points: [
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 4, y: 4 },
      ],
    },
  ] as AnyCircuitElement[]
  const renderedCircuitJson = [
    {
      type: "source_net",
      source_net_id: "source_net_rendered",
      name: "GND",
      member_source_group_ids: [],
    },
  ] as AnyCircuitElement[]

  const materializedCircuitJson = materializeImportedCopperPours({
    renderedCircuitJson,
    sourceCircuitJson,
  })

  expect(materializedCircuitJson).toContainEqual(
    expect.objectContaining({
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pcb_copper_pour_imported",
      source_net_id: "source_net_rendered",
    }),
  )
})
