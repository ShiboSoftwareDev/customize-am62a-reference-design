import { drv8307EvmDefinition } from "../generated/ti-evms/drv8307evm.generated"
import { Drv8307Evm } from "../generated/ti-evms/drv8307evm.circuit"
import { lm5155EvmFlyDefinition } from "../generated/ti-evms/lm5155evm-fly.generated"
import { Lm5155EvmFly } from "../generated/ti-evms/lm5155evm-fly.circuit"
import { lm251772EvmPdDefinition } from "../generated/ti-evms/lm251772evm-pd.generated"
import { Lm251772EvmPd } from "../generated/ti-evms/lm251772evm-pd.circuit"
import { lmg342xBbEvmDefinition } from "../generated/ti-evms/lmg342x-bb-evm.generated"
import { Lmg342xBbEvm } from "../generated/ti-evms/lmg342x-bb-evm.circuit"
import type { ReferenceEvmDefinition } from "./reference-evm-types"

export type ParameterizedTiEvmId =
  | "drv8307evm"
  | "lm5155evm-fly"
  | "lm251772evm-pd"
  | "lmg342x-bb-evm"

export type ParameterizedTiEvmOptions = {
  removedFeatureIds: string[]
}

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
  switch (props.evmId) {
    case "drv8307evm":
      return <Drv8307Evm removedFeatureIds={props.options.removedFeatureIds} />
    case "lm5155evm-fly":
      return <Lm5155EvmFly removedFeatureIds={props.options.removedFeatureIds} />
    case "lm251772evm-pd":
      return <Lm251772EvmPd removedFeatureIds={props.options.removedFeatureIds} />
    case "lmg342x-bb-evm":
      return <Lmg342xBbEvm removedFeatureIds={props.options.removedFeatureIds} />
  }
}
