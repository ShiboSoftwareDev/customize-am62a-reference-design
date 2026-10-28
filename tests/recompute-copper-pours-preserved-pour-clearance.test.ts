import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { recomputeCopperPours } from "../scripts/prebuild-ti-evm-assets/recompute-copper-pours"

test("recomputed ground copper clears preserved power pours", async () => {
  const result = await recomputeCopperPours({
    circuitJson: createCircuitJson(),
    definitions: [{ layer: "top", sourceNetName: "GND" }],
  })
  const recomputedGroundPour = result.circuitJson.find(
    (element) =>
      element.type === "pcb_copper_pour" &&
      element.pcb_copper_pour_id === "pcb_copper_pour_recomputed_top_0",
  )

  expect(recomputedGroundPour?.shape).toBe("brep")
  expect(recomputedGroundPour?.brep_shape).toMatchObject({
    inner_rings: [
      {
        vertices: [
          { x: -2.2, y: -2.2 },
          { x: 2.2, y: -2.2 },
          { x: 2.2, y: 2.2 },
          { x: -2.2, y: 2.2 },
        ],
      },
    ],
  })
  expect(
    result.circuitJson.some(
      (element) =>
        element.type === "pcb_copper_pour" &&
        element.pcb_copper_pour_id === "pcb_copper_pour_imported_ground",
    ),
  ).toBe(true)
})

function createCircuitJson(): AnyCircuitElement[] {
  return [
    {
      type: "source_net",
      source_net_id: "source_net_ground",
      name: "GND",
      subcircuit_id: "subcircuit_1",
      subcircuit_connectivity_map_key: "subcircuit_1_ground",
    },
    {
      type: "source_net",
      source_net_id: "source_net_power",
      name: "VCC",
      subcircuit_id: "subcircuit_1",
      subcircuit_connectivity_map_key: "subcircuit_1_power",
    },
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_1",
      subcircuit_id: "subcircuit_1",
      center: { x: 0, y: 0 },
      width: 20,
      height: 20,
      outline: [
        { x: -10, y: -10 },
        { x: 10, y: -10 },
        { x: 10, y: 10 },
        { x: -10, y: 10 },
      ],
    },
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pcb_copper_pour_imported_ground",
      shape: "polygon",
      layer: "top",
      source_net_id: "source_net_ground",
      subcircuit_id: "subcircuit_1",
      points: [
        { x: -9, y: -9 },
        { x: 9, y: -9 },
        { x: 9, y: 9 },
        { x: -9, y: 9 },
      ],
      covered_with_solder_mask: true,
    },
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pcb_copper_pour_preserved_power",
      shape: "polygon",
      layer: "top",
      source_net_id: "source_net_power",
      subcircuit_id: "subcircuit_1",
      points: [
        { x: -2, y: -2 },
        { x: 2, y: -2 },
        { x: 2, y: 2 },
        { x: -2, y: 2 },
      ],
      covered_with_solder_mask: true,
    },
  ]
}
