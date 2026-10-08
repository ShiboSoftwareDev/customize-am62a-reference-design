import { Drv8307Evm as GeneratedDrv8307Evm } from "../../lib/generated/ti-evms/drv8307evm.circuit"

export type Drv8307EvmProps = {
  removeOnboardSpeedControl?: boolean
  removeSingleEndedHallConditioning?: boolean
  removeTestPoints?: boolean
  removeStatusIndicators?: boolean
}

export function Drv8307Evm(props: Drv8307EvmProps) {
  const removedFeatureIds = [
    props.removeOnboardSpeedControl && "onboard-speed-control",
    props.removeSingleEndedHallConditioning && "single-ended-hall-conditioning",
    props.removeTestPoints && "test-points",
    props.removeStatusIndicators && "status-indicators",
  ].filter((featureId): featureId is string => Boolean(featureId))

  return <GeneratedDrv8307Evm removedFeatureIds={removedFeatureIds} />
}

export default () => <Drv8307Evm />
