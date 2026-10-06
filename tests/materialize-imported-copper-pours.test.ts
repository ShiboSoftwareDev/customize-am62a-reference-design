import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { materializeImportedCopperPours } from "../scripts/ti-evm-reference-generator/materialize-imported-copper-pours"

test("materializes exact imported pours without synthetic or dangling nets", () => {
  const sourceCircuitJson = [
    {
      type: "source_net",
      source_net_id: "source_net_ground",
      name: "GND",
      member_source_group_ids: [],
    },
    {
      type: "source_net",
      source_net_id: "source_net_removed",
      name: "REMOVED",
      member_source_group_ids: [],
    },
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pcb_copper_pour_curved",
      source_net_id: "source_net_ground",
      layer: "top",
      shape: "brep",
      brep_shape: {
        outer_ring: {
          vertices: [
            { x: -4, y: 0, bulge: 1 },
            { x: 4, y: 0, bulge: 1 },
          ],
        },
        inner_rings: [],
      },
    },
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pcb_copper_pour_netless",
      layer: "bottom",
      shape: "polygon",
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
      ],
    },
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pcb_copper_pour_removed",
      source_net_id: "source_net_removed",
      layer: "top",
      shape: "polygon",
      points: [
        { x: 2, y: 2 },
        { x: 3, y: 2 },
        { x: 2, y: 3 },
      ],
    },
    {
      type: "source_net",
      source_net_id: "source_net_variant_removed",
      name: "VARIANT_REMOVED",
      member_source_group_ids: [],
    },
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pcb_copper_pour_variant_removed",
      source_net_id: "source_net_variant_removed",
      layer: "bottom",
      shape: "polygon",
      points: [
        { x: 4, y: 4 },
        { x: 5, y: 4 },
        { x: 4, y: 5 },
      ],
    },
  ] as AnyCircuitElement[]
  const renderedCircuitJson = [
    {
      type: "source_net",
      source_net_id: "source_net_rendered_ground",
      name: "GND",
      member_source_group_ids: [],
    },
  ] as AnyCircuitElement[]

  const materialized = materializeImportedCopperPours({
    renderedCircuitJson,
    sourceCircuitJson,
    sourceNetNamesToImport: new Set(["REMOVED"]),
  })

  expect(materialized).toContainEqual({
    ...sourceCircuitJson[2],
    source_net_id: "source_net_rendered_ground",
  })
  expect(materialized).toContainEqual(sourceCircuitJson[3])
  expect(materialized).toContainEqual(sourceCircuitJson[1])
  expect(materialized).toContainEqual(sourceCircuitJson[4])
  expect(
    materialized.some(
      (element) =>
        "source_net_id" in element && element.source_net_id === "source_net_variant_removed",
    ),
  ).toBe(false)
  expect(
    materialized.some(
      (element) =>
        element.type === "source_net" &&
        typeof element.name === "string" &&
        element.name.startsWith("__circuit_json_unassigned"),
    ),
  ).toBe(false)
})
