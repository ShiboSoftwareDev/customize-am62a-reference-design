import { ReferenceEvmBoard } from "../../lib/evms/ReferenceEvmBoard"
import { drv8307EvmDefinition } from "../../lib/generated/ti-evms/drv8307evm.generated"

export type Drv8307EvmProps = {
  removeOnboardSpeedControl?: boolean
  removeHallInterface?: boolean
}

export function Drv8307Evm(props: Drv8307EvmProps) {
  const removedFeatureIds = [
    props.removeOnboardSpeedControl && "onboard-speed-control",
    props.removeHallInterface && "hall-interface",
  ].filter((featureId): featureId is string => Boolean(featureId))

  return <ReferenceEvmBoard definition={drv8307EvmDefinition} options={{ removedFeatureIds }} />
}

export default () => <Drv8307Evm />
