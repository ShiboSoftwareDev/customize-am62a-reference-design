import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { getSupportedCopperPours } from "../scripts/ti-evm-reference-generator/get-supported-copper-pours"

test("carries component feature ownership into supported copper pours", () => {
  const circuitJson = [
    {
      type: "source_net",
      source_net_id: "source_net_optional",
      name: "OPTIONAL_POWER",
      member_source_group_ids: [],
    },
    {
      type: "pcb_component",
      pcb_component_id: "pcb_component_optional",
      source_component_id: "source_component_optional",
      center: { x: 0, y: 0 },
      width: 1,
      height: 1,
      layer: "top",
      rotation: 0,
    },
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pcb_copper_pour_optional",
      pcb_component_id: "pcb_component_optional",
      source_net_id: "source_net_optional",
      layer: "top",
      shape: "polygon",
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
      ],
    },
  ] as AnyCircuitElement[]

  const supportedCopperPours = getSupportedCopperPours({
    circuitJson,
    featureIdBySourceComponentId: new Map([["source_component_optional", "optional-interface"]]),
  })

  expect(supportedCopperPours).toEqual([
    {
      coveredWithSolderMask: true,
      layer: "top",
      netName: "OPTIONAL_POWER",
      outline: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
      ],
      pcbCopperPourId: "pcb_copper_pour_optional",
      removableFeatureId: "optional-interface",
    },
  ])
})
