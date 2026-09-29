import { ReferenceEvmBoard } from "../../lib/evms/ReferenceEvmBoard"
import { lmg342xBbEvmDefinition } from "../../lib/generated/ti-evms/lmg342x-bb-evm.generated"

export type Lmg342xBbEvmProps = {
  removeMeasurementInterface?: boolean
  removeStatusIndicators?: boolean
}

export function Lmg342xBbEvm(props: Lmg342xBbEvmProps) {
  const removedFeatureIds = [
    props.removeMeasurementInterface && "measurement-interface",
    props.removeStatusIndicators && "status-indicators",
  ].filter((featureId): featureId is string => Boolean(featureId))

  return <ReferenceEvmBoard definition={lmg342xBbEvmDefinition} options={{ removedFeatureIds }} />
}

export default () => <Lmg342xBbEvm />
