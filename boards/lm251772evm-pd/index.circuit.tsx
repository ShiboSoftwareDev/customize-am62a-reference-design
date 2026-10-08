import { Lm251772EvmPd as GeneratedLm251772EvmPd } from "../../lib/generated/ti-evms/lm251772evm-pd.circuit"

export type Lm251772EvmPdProps = {
  removePowerMeasurementAccess?: boolean
  removeControlDebugAccess?: boolean
  removeUsb2AnyInterface?: boolean
}

export function Lm251772EvmPd(props: Lm251772EvmPdProps) {
  const removedFeatureIds = [
    props.removePowerMeasurementAccess && "power-measurement-access",
    props.removeControlDebugAccess && "control-debug-access",
    props.removeUsb2AnyInterface && "usb2any-interface",
  ].filter((featureId): featureId is string => Boolean(featureId))

  return <GeneratedLm251772EvmPd removedFeatureIds={removedFeatureIds} />
}

export default () => <Lm251772EvmPd />
