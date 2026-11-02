import type { TiEvmId } from "../../lib/ti-evm-catalog"
import type { ComponentName } from "./read-source-footprints"
import notFittedComponentNames from "./not-fitted-component-names.json"

export function getDnpComponentNames(evmId: TiEvmId): ReadonlySet<ComponentName> {
  // Reference BOM revisions and population policy are documented with the CAD
  // assets. Apply the whole assembly list, including non-overlapping omissions.
  return new Set(notFittedComponentNames[evmId])
}
