import { Lmg342xBbEvm as GeneratedLmg342xBbEvm } from "../../lib/generated/ti-evms/lmg342x-bb-evm.circuit"

export type Lmg342xBbEvmProps = {
  removeMeasurementInterface?: boolean
  removeStatusIndicators?: boolean
}

export function Lmg342xBbEvm(props: Lmg342xBbEvmProps) {
  const removedFeatureIds = [
    props.removeMeasurementInterface && "measurement-interface",
    props.removeStatusIndicators && "status-indicators",
  ].filter((featureId): featureId is string => Boolean(featureId))

  return <GeneratedLmg342xBbEvm removedFeatureIds={removedFeatureIds} />
}

export default () => <Lmg342xBbEvm />
