import type { TiEvmId } from "../../lib/ti-evm-catalog"
import type { ComponentName } from "./read-source-footprints"

export function getDnpComponentNames(evmId: TiEvmId): ReadonlySet<ComponentName> {
  switch (evmId) {
    case "beagleplay":
      // The released BeaglePlay BOM fits C1 and the common-mode chokes;
      // R221 and the four choke-bypass resistors are co-layout alternatives.
      return new Set(["J6", "J11", "J19", "OSC2", "R221", "R219", "R225", "R264", "R265"])
    case "tmds62levm":
      // PROC181E1-1_BOM.xls marks these bypass resistors Not Fitted;
      // L2 and L9 are Fitted in the same release.
      return new Set([
        "U44",
        "U51",
        "U105",
        "U109",
        "U116",
        "U118",
        "U122",
        "U129",
        "R181",
        "R185",
        "R266",
        "R271",
      ])
    default:
      return new Set()
  }
}
