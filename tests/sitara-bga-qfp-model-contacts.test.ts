import { expect, test } from "bun:test"
import { tiEvms } from "../lib/ti-evm-catalog"
import { getDnpComponentNames } from "../scripts/prebuild-ti-evm-cad-scenes/get-dnp-component-names"
import type { ComponentName } from "../scripts/prebuild-ti-evm-cad-scenes/read-source-footprints"
import {
  findMissingPackageContacts,
  readPrebuiltPackageReview,
} from "./fixtures/read-prebuilt-package-review"

test("every generated Sitara BGA QFP and LGA model meets its imported lands in every variant", async () => {
  let checkedPackageCount = 0
  for (const evm of tiEvms) {
    const excludedComponentNames = getDnpComponentNames(evm.id)
    for (const variant of evm.variants) {
      const review = await readPrebuiltPackageReview(evm.id, variant.id)
      const presentComponentNames = new Set<ComponentName>(
        review.circuitJson.flatMap((element) =>
          element.type === "source_component" && typeof element.name === "string"
            ? [element.name]
            : [],
        ),
      )
      for (const [componentName, footprint] of Object.entries(review.footprints)) {
        if (excludedComponentNames.has(componentName) || !presentComponentNames.has(componentName))
          continue
        if (
          !/^(?:(?:DSBGA|TFBGA|TPBGA|V?FBGA|BGA|TQFP|LQFP|QFP)\d+|AM33XX_|E-\d+_)/u.test(footprint)
        )
          continue
        expect(findMissingPackageContacts({ componentName, review })).toEqual([])
        checkedPackageCount++
      }
    }
  }
  expect(checkedPackageCount).toBeGreaterThan(20)
}, 60_000)
