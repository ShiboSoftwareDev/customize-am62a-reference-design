import { expect, test } from "bun:test"
import { lm251772EvmPdDefinition } from "lib/generated/ti-evms/lm251772evm-pd.generated"
import { getTiEvm } from "lib/ti-evm-catalog"

test("LM251772 configuration jumpers remain populated in every variant", () => {
  const configurationJumpers = lm251772EvmPdDefinition.components.filter(({ name }) =>
    /^JP/u.test(name),
  )

  expect(configurationJumpers).toHaveLength(12)
  expect(
    configurationJumpers.every(({ removableFeatureId }) => removableFeatureId === undefined),
  ).toBe(true)
  expect(getTiEvm("lm251772evm-pd").removableFeatures.map(({ id }) => id)).not.toContain(
    "configuration-jumpers",
  )
})
