import { Lm5155EvmFly as GeneratedLm5155EvmFly } from "../../lib/generated/ti-evms/lm5155evm-fly.circuit"

export type Lm5155EvmFlyProps = {
  removeTestAndMeasurement?: boolean
  removeConfigurationInterface?: boolean
}

export function Lm5155EvmFly(props: Lm5155EvmFlyProps) {
  const removedFeatureIds = [
    props.removeTestAndMeasurement && "test-and-measurement",
    props.removeConfigurationInterface && "configuration-interface",
  ].filter((featureId): featureId is string => Boolean(featureId))

  return <GeneratedLm5155EvmFly removedFeatureIds={removedFeatureIds} />
}

export default () => <Lm5155EvmFly />
