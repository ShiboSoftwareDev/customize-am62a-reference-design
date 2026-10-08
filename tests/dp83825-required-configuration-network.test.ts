import { expect, test } from "bun:test"
import { dp83825EvmDefinition } from "lib/generated/ti-evms/dp83825evm.generated"
import { getTiEvm } from "lib/ti-evm-catalog"

test("DP83825 strap and configuration network is retained in every variant", () => {
  const requiredComponentNames = [
    "J2",
    "J3",
    "J4",
    "J5",
    "J6",
    "J7",
    "J8",
    "J9",
    "J13",
    "J14",
    "J16",
    "J17",
    "J18",
    "S1",
    "R9",
    "R10",
    "R11",
    "R12",
    "R13",
    "R14",
    "R15",
    "R16",
    "R17",
    "R18",
    "R19",
  ]

  for (const componentName of requiredComponentNames) {
    expect(
      dp83825EvmDefinition.components.find(({ name }) => name === componentName)
        ?.removableFeatureId,
    ).toBeUndefined()
  }
  expect(getTiEvm("dp83825evm").removableFeatures.map(({ id }) => id)).not.toContain(
    "configuration-headers",
  )
})
