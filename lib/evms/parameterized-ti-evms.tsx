import { drv8307EvmDefinition } from "../generated/ti-evms/drv8307evm.generated"
import { lm5155EvmFlyDefinition } from "../generated/ti-evms/lm5155evm-fly.generated"
import { lm251772EvmPdDefinition } from "../generated/ti-evms/lm251772evm-pd.generated"
import { lmg342xBbEvmDefinition } from "../generated/ti-evms/lmg342x-bb-evm.generated"
import { ReferenceEvmBoard, type ReferenceEvmBoardOptions } from "./ReferenceEvmBoard"
import type { ReferenceEvmDefinition } from "./reference-evm-types"

export type ParameterizedTiEvmId =
  | "drv8307evm"
  | "lm5155evm-fly"
  | "lm251772evm-pd"
  | "lmg342x-bb-evm"

export type ParameterizedTiEvmOptions = ReferenceEvmBoardOptions

const definitions: Record<ParameterizedTiEvmId, ReferenceEvmDefinition> = {
  drv8307evm: drv8307EvmDefinition,
  "lm5155evm-fly": lm5155EvmFlyDefinition,
  "lm251772evm-pd": lm251772EvmPdDefinition,
  "lmg342x-bb-evm": lmg342xBbEvmDefinition,
}

export function getParameterizedTiEvmDefinition(
  evmId: ParameterizedTiEvmId,
): ReferenceEvmDefinition {
  return definitions[evmId]
}

export function ParameterizedTiEvm(props: {
  evmId: ParameterizedTiEvmId
  options: ParameterizedTiEvmOptions
}) {
  return <ReferenceEvmBoard definition={definitions[props.evmId]} options={props.options} />
}
