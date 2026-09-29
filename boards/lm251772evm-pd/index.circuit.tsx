import { ReferenceEvmBoard } from "../../lib/evms/ReferenceEvmBoard"
import { lm251772EvmPdDefinition } from "../../lib/generated/ti-evms/lm251772evm-pd.generated"

export type Lm251772EvmPdProps = {
  removeTestAndMeasurement?: boolean
  removeConfigurationJumpers?: boolean
}

export function Lm251772EvmPd(props: Lm251772EvmPdProps) {
  const removedFeatureIds = [
    props.removeTestAndMeasurement && "test-and-measurement",
    props.removeConfigurationJumpers && "configuration-jumpers",
  ].filter((featureId): featureId is string => Boolean(featureId))

  return <ReferenceEvmBoard definition={lm251772EvmPdDefinition} options={{ removedFeatureIds }} />
}

export default () => <Lm251772EvmPd />
