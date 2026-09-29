import { ReferenceEvmBoard } from "../../lib/evms/ReferenceEvmBoard"
import { lm5155EvmFlyDefinition } from "../../lib/generated/ti-evms/lm5155evm-fly.generated"

export type Lm5155EvmFlyProps = {
  removeTestAndMeasurement?: boolean
  removeConfigurationInterface?: boolean
}

export function Lm5155EvmFly(props: Lm5155EvmFlyProps) {
  const removedFeatureIds = [
    props.removeTestAndMeasurement && "test-and-measurement",
    props.removeConfigurationInterface && "configuration-interface",
  ].filter((featureId): featureId is string => Boolean(featureId))

  return <ReferenceEvmBoard definition={lm5155EvmFlyDefinition} options={{ removedFeatureIds }} />
}

export default () => <Lm5155EvmFly />
