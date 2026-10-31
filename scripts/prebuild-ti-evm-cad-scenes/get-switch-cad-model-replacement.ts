import type { CadModelComponentIdentity, CadModelReplacement } from "./get-cad-model-replacement"
import { createDipSwitchCadModel } from "./create-dip-switch-cad-model"
import { createTactileSwitchCadModel } from "./create-dimensioned-package-cad-models"
import { getPackageBodyDimensionsMillimeters } from "./get-package-body-dimensions"

export function getSwitchCadModelReplacement({
  altiumFootprint,
  manufacturerPartNumber,
}: CadModelComponentIdentity): CadModelReplacement | undefined {
  const normalizedFootprint = altiumFootprint.trim().toUpperCase()
  const partNumber = manufacturerPartNumber?.trim().toUpperCase()

  if (
    partNumber === "GDH02S04" ||
    partNumber === "1571983-1" ||
    normalizedFootprint === "SW4_49-99_150X230_SMD_2-7"
  ) {
    return { kind: "jscad", jscadOperations: createDipSwitchCadModel({ poleCount: 2 }) }
  }
  if (partNumber === "416131160804" || normalizedFootprint.includes("_416131160804_")) {
    return { kind: "jscad", jscadOperations: createDipSwitchCadModel({ poleCount: 4 }) }
  }
  if (partNumber === "416131160808" || normalizedFootprint.includes("_416131160808_")) {
    return { kind: "jscad", jscadOperations: createDipSwitchCadModel({ poleCount: 8 }) }
  }

  const isKnownTactileSwitch =
    /^BUTTON2_3P_4D55X2D3X1D88MM/u.test(normalizedFootprint) ||
    /^SW4SMD_63X161LS/u.test(normalizedFootprint) ||
    /^SW4_100X216_200X200_SMD/u.test(normalizedFootprint) ||
    /^SW4_161-41X62-99_170X110_SMD/u.test(normalizedFootprint)
  if (!isKnownTactileSwitch) return undefined

  const switchDimensions = getPackageBodyDimensionsMillimeters(normalizedFootprint) ?? {
    x: 6,
    y: 4,
  }
  return {
    kind: "jscad",
    jscadOperations: createTactileSwitchCadModel({
      length: switchDimensions.x,
      width: switchDimensions.y,
    }),
  }
}
