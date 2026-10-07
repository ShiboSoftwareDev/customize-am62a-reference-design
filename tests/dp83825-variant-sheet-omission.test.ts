import { expect, test } from "bun:test"
import {
  getTiEvm,
  getTiEvmVariantForRemovedFeatures,
  getTiEvmVariantSchematicCircuitJsonUrls,
  getTiEvmVariantSchematicSheetLabels,
} from "../lib/ti-evm-catalog"

test("DP83825 USB controller removal omits its empty schematic sheet", () => {
  const evm = getTiEvm("dp83825evm")
  const variant = getTiEvmVariantForRemovedFeatures(evm, ["usb-mdio-controller"])

  expect(getTiEvmVariantSchematicSheetLabels(evm, variant)).toEqual([
    "HSDC045A_DP83825.SchDoc",
    "HSDC045A_Power.SchDoc",
    "HSDC045A_Hardware.SchDoc",
    "HSDC045A_CoverSheet.SchDoc",
  ])
  expect(getTiEvmVariantSchematicCircuitJsonUrls(variant)).not.toContain(
    "/prebuilt-ti-evms/dp83825evm/remove-usb-mdio-controller.schematic-2.circuit.json.gz",
  )
})
