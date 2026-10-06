import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { getSupportedCopperPours } from "../scripts/ti-evm-reference-generator/get-supported-copper-pours"

test("creates TSX copper-pour definitions for rect, polygon, BRep, and netless copper", () => {
  const circuitJson = [
    {
      type: "source_net",
      source_net_id: "source_net_ground",
      name: "GND",
      member_source_group_ids: [],
    },
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pcb_copper_pour_rect",
      source_net_id: "source_net_ground",
      layer: "top",
      covered_with_solder_mask: false,
      shape: "rect",
      center: { x: 2, y: 3 },
      width: 4,
      height: 2,
      rotation: 90,
    },
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pcb_copper_pour_brep",
      source_net_id: "source_net_ground",
      layer: "top",
      shape: "brep",
      brep_shape: {
        outer_ring: {
          vertices: [
            { x: 0, y: 0, bulge: 1 },
            { x: 2, y: 0 },
            { x: 0, y: 2 },
          ],
        },
        inner_rings: [
          {
            vertices: [
              { x: 0.5, y: 0.5 },
              { x: 1, y: 0.5 },
              { x: 0.5, y: 1 },
            ],
          },
        ],
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
  ] as AnyCircuitElement[]

  const supportedCopperPours = getSupportedCopperPours({ circuitJson })

  expect(supportedCopperPours).toHaveLength(3)
  expect(supportedCopperPours[0]).toMatchObject({
    coveredWithSolderMask: false,
    layer: "top",
    netName: "GND",
  })
  const expectedOutline = [
    { x: 3, y: 1 },
    { x: 3, y: 5 },
    { x: 1, y: 5 },
    { x: 1, y: 1 },
  ]
  for (const [pointIndex, expectedPoint] of expectedOutline.entries()) {
    expect(supportedCopperPours[0]?.outline[pointIndex]?.x).toBeCloseTo(expectedPoint.x, 12)
    expect(supportedCopperPours[0]?.outline[pointIndex]?.y).toBeCloseTo(expectedPoint.y, 12)
  }
  expect(supportedCopperPours[1]).toMatchObject({
    netName: "GND",
    outline: [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 0, y: 2 },
    ],
  })
  expect(supportedCopperPours[2]).toMatchObject({
    netName: "__unassigned_pcb_copper_pour_netless",
  })
})
