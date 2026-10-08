import { Dp83825Evm as GeneratedDp83825Evm } from "../../lib/generated/ti-evms/dp83825evm.circuit"

export type Dp83825EvmProps = {
  removeUsbMdioController?: boolean
  removePowerIndicator?: boolean
  removePhyStatusIndicators?: boolean
  removeClockTestAccess?: boolean
}

export function Dp83825Evm(props: Dp83825EvmProps) {
  const removedFeatureIds = [
    props.removeUsbMdioController && "usb-mdio-controller",
    props.removePowerIndicator && "power-indicator",
    props.removePhyStatusIndicators && "phy-status-indicators",
    props.removeClockTestAccess && "clock-test-access",
  ].filter((featureId): featureId is string => Boolean(featureId))

  return <GeneratedDp83825Evm removedFeatureIds={removedFeatureIds} />
}

export default () => <Dp83825Evm />
