import { expect, test } from "bun:test"
import { getDisplayedSchematics } from "app/hooks/get-displayed-schematics"
import { tiEvms } from "lib/ti-evm-catalog"

test("keeps the current schematic mounted while another variant loads", () => {
  const evm = tiEvms[0]
  const previousVariant = evm.variants[0]
  const requestedVariant = evm.variants[1]
  const previousSchematics = {
    evmId: evm.id,
    variant: previousVariant,
    circuitJsons: [[{ type: "source_component", source_component_id: "source_component_1" }]],
  }

  const displayedSchematics = getDisplayedSchematics({
    evmId: evm.id,
    variant: requestedVariant,
    cachedCircuitJsons: undefined,
    previousSchematics,
  })

  expect(displayedSchematics).toBe(previousSchematics)
})
