import type { AnyCircuitElement } from "circuit-json"
import type { TiEvmId, TiEvmVariant } from "lib/ti-evm-catalog"

export type DisplayedSchematics = {
  evmId: TiEvmId
  variant: TiEvmVariant
  circuitJsons: AnyCircuitElement[][]
}

export function getDisplayedSchematics({
  evmId,
  variant,
  cachedCircuitJsons,
  previousSchematics,
}: {
  evmId: TiEvmId
  variant: TiEvmVariant
  cachedCircuitJsons: AnyCircuitElement[][] | undefined
  previousSchematics: DisplayedSchematics | null
}): DisplayedSchematics | null {
  if (cachedCircuitJsons) {
    return { evmId, variant, circuitJsons: cachedCircuitJsons }
  }
  if (previousSchematics?.evmId === evmId) return previousSchematics
  return null
}
