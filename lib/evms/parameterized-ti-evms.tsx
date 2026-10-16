import { BeagleBoneBlack } from "../generated/ti-evms/beaglebone-black.circuit"
import { beagleBoneBlackDefinition } from "../generated/ti-evms/beaglebone-black.generated"
import { BeaglePlay } from "../generated/ti-evms/beagleplay.circuit"
import { beaglePlayDefinition } from "../generated/ti-evms/beagleplay.generated"
import { SkAm62 } from "../generated/ti-evms/sk-am62.circuit"
import { skAm62Definition } from "../generated/ti-evms/sk-am62.generated"
import { Tmds62lEvm } from "../generated/ti-evms/tmds62levm.circuit"
import { tmds62lEvmDefinition } from "../generated/ti-evms/tmds62levm.generated"
import type { ReferenceEvmDefinition } from "./reference-evm-types"

export type ParameterizedTiEvmId = "tmds62levm" | "sk-am62" | "beagleplay" | "beaglebone-black"

export type ParameterizedTiEvmOptions = {
  removedFeatureIds: string[]
}

const definitions: Record<ParameterizedTiEvmId, ReferenceEvmDefinition> = {
  tmds62levm: tmds62lEvmDefinition,
  "sk-am62": skAm62Definition,
  beagleplay: beaglePlayDefinition,
  "beaglebone-black": beagleBoneBlackDefinition,
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
    case "tmds62levm":
      return <Tmds62lEvm removedFeatureIds={props.options.removedFeatureIds} />
    case "sk-am62":
      return <SkAm62 removedFeatureIds={props.options.removedFeatureIds} />
    case "beagleplay":
      return <BeaglePlay removedFeatureIds={props.options.removedFeatureIds} />
    case "beaglebone-black":
      return <BeagleBoneBlack removedFeatureIds={props.options.removedFeatureIds} />
  }
}
