import type { TiEvmId } from "../../lib/ti-evm-catalog"
import type { ComponentName } from "./read-source-footprints"

export function getDnpComponentNames(evmId: TiEvmId): ReadonlySet<ComponentName> {
  switch (evmId) {
    case "beagleplay":
      return new Set(["OSC2"])
    case "tmds62levm":
      return new Set(["U44", "U51", "U105", "U109", "U116", "U118", "U122", "U129"])
    default:
      return new Set()
  }
}
