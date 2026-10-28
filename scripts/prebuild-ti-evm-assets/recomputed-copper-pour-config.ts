import type { TiEvmId } from "../../lib/ti-evm-catalog"

export type RecomputedCopperPourLayer = "bottom" | "inner1" | "top"

export type RecomputedCopperPourDefinition = {
  layer: RecomputedCopperPourLayer
  sourceNetName: string
}

// Recompute broad reference ground fills only. Small local pours and dense
// internal planes retain their imported geometry instead of being expanded to
// the entire board outline.
const definitionsByEvmId: Partial<Record<TiEvmId, readonly RecomputedCopperPourDefinition[]>> = {
  tmds62levm: [
    { layer: "top", sourceNetName: "DGND" },
    { layer: "bottom", sourceNetName: "DGND" },
  ],
  "sk-am62": [
    { layer: "top", sourceNetName: "DGND" },
    { layer: "bottom", sourceNetName: "DGND" },
  ],
  beagleplay: [
    { layer: "top", sourceNetName: "GND" },
    { layer: "bottom", sourceNetName: "GND" },
  ],
  "beaglebone-black": [{ layer: "inner1", sourceNetName: "DGND" }],
}

export function getRecomputedCopperPourDefinitions(
  evmId: TiEvmId,
): readonly RecomputedCopperPourDefinition[] {
  return definitionsByEvmId[evmId] ?? []
}
