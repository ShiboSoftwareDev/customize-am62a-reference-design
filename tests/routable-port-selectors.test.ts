import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { getRoutablePortSelectors } from "../scripts/ti-evm-reference-generator/prepare-converter-circuit-json"

test("preserves unique imported selectors for repeated and special pin names", () => {
  const circuitJson = [
    {
      type: "source_component",
      source_component_id: "source_component_0",
      name: "U9",
      ftype: "simple_chip",
    },
    {
      type: "source_port",
      source_port_id: "source_port_0",
      source_component_id: "source_component_0",
      name: "VDD/IO#",
    },
    {
      type: "source_port",
      source_port_id: "source_port_1",
      source_component_id: "source_component_0",
      name: "VDD/IO#",
    },
    {
      type: "pcb_port",
      pcb_port_id: "pcb_port_0",
      source_port_id: "source_port_0",
      x: 0,
      y: 0,
      layers: ["top"],
    },
    {
      type: "pcb_port",
      pcb_port_id: "pcb_port_1",
      source_port_id: "source_port_1",
      x: 1,
      y: 0,
      layers: ["top"],
    },
  ] as AnyCircuitElement[]

  expect(getRoutablePortSelectors(circuitJson)).toEqual(
    new Set([".U9 > .imported_pcb_port_1", ".U9 > .imported_pcb_port_2"]),
  )
})
