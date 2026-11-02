import { getRegisteredLeadedPackageReplacement } from "./get-registered-leaded-package-replacement"
import type { CadModelComponentIdentity, CadModelReplacement } from "./get-cad-model-replacement"
import { createBgaCadModel, createQfpCadModel } from "./create-integrated-circuit-cad-models"
import {
  createTwoTerminalCadModel,
  type TwoTerminalPackageKind,
} from "./create-two-terminal-cad-model"
import {
  createCeramicAntennaCadModel,
  createEmiFilterCadModel,
  createRadialPolyfuseCadModel,
} from "./create-board-specific-package-cad-models"
import { getDimensionedMechanicalPackageReplacement } from "./get-dimensioned-mechanical-package-replacement"
import { getPackageBodyDimensionsMillimeters } from "./get-package-body-dimensions"
import { getSwitchCadModelReplacement } from "./get-switch-cad-model-replacement"
import { externalStepModelUrls } from "./external-cad-model-urls"
import type { ModelLocalPad } from "./get-model-local-pads"
import { getMultiTerminalResistorReplacement } from "./get-multi-terminal-resistor-replacement"
import { getSmallTransistorCadModelReplacement } from "./get-small-transistor-cad-model-replacement"
import { getPackageHeightMillimeters } from "./get-package-height-millimeters"
import { getLeadlessPackageReplacement } from "./get-leadless-package-replacement"
import { getIndicatorLedReplacement } from "./get-indicator-led-replacement"
import { getLeadlessDiodeCadModelReplacement } from "./get-leadless-diode-cad-model-replacement"

type ImperialPackageSize =
  | "01005"
  | "0201"
  | "0402"
  | "0603"
  | "0805"
  | "1206"
  | "1210"
  | "2010"
  | "2512"

function createFootprinterReplacement(
  footprinterString: string,
  modelYawOffsetDegrees?: number,
): CadModelReplacement {
  if (modelYawOffsetDegrees === undefined) return { kind: "footprinter", footprinterString }
  return { kind: "footprinter", footprinterString, modelYawOffsetDegrees }
}

function getImperialPackageSize(altiumFootprint: string): ImperialPackageSize | undefined {
  const normalizedFootprint = altiumFootprint.toUpperCase()
  const explicitSize =
    /(?:^|[_-]|[RCLDF]|RES|CAP|IND|DIO|LED)(01005|0201|0402|0603|0805|1206|1210|2010|2512)(?:[_-]|$)/u.exec(
      normalizedFootprint,
    )?.[1]
  if (isImperialPackageSize(explicitSize)) return explicitSize

  if (normalizedFootprint === "402") return "0402"
  if (normalizedFootprint === "805") return "0805"
  return undefined
}

function isImperialPackageSize(
  packageSize: string | undefined,
): packageSize is ImperialPackageSize {
  switch (packageSize) {
    case "01005":
    case "0201":
    case "0402":
    case "0603":
    case "0805":
    case "1206":
    case "1210":
    case "2010":
    case "2512":
      return true
    default:
      return false
  }
}

function getTwoTerminalPackageReplacement(
  componentIdentity: CadModelComponentIdentity,
  modelLocalPads: ModelLocalPad[],
): CadModelReplacement | undefined {
  const imperialPackageSize = getImperialPackageSize(componentIdentity.altiumFootprint)
  if (!imperialPackageSize) return undefined
  // A size token alone does not make arrays or Kelvin packages two-terminal.
  if (/RESA_|4TERM|1206-4/u.test(componentIdentity.altiumFootprint.toUpperCase())) return undefined

  if (componentIdentity.componentName.startsWith("C")) {
    return createTwoTerminalReplacement({
      kind: "capacitor",
      packageSize: imperialPackageSize,
      modelLocalPads,
    })
  }
  if (/^(?:R|L|FB|FL|F)\d/u.test(componentIdentity.componentName)) {
    const kind = componentIdentity.componentName.startsWith("R") ? "resistor" : "inductor"
    return createTwoTerminalReplacement({ kind, packageSize: imperialPackageSize, modelLocalPads })
  }
  if (componentIdentity.componentName.startsWith("LED")) {
    return createTwoTerminalReplacement({
      kind: "led",
      packageSize: imperialPackageSize,
      modelLocalPads,
    })
  }
  if (componentIdentity.componentName.startsWith("D")) {
    return createTwoTerminalReplacement({
      kind: "diode",
      packageSize: imperialPackageSize,
      modelLocalPads,
    })
  }
  return undefined
}

function createTwoTerminalReplacement(params: {
  kind: TwoTerminalPackageKind
  packageSize: ImperialPackageSize
  modelLocalPads: ModelLocalPad[]
}): CadModelReplacement {
  return {
    kind: "jscad",
    jscadOperations: createTwoTerminalCadModel(params),
  }
}

function getSmallOutlinePackageReplacement(
  normalizedFootprint: string,
): CadModelReplacement | undefined {
  const packageMatchers: Array<{
    footprinterPrefix: string
    pattern: RegExp
  }> = [
    { footprinterPrefix: "tssop", pattern: /^TSSOP(\d+)/u },
    { footprinterPrefix: "msop", pattern: /^MSOP(\d+)/u },
    { footprinterPrefix: "vssop", pattern: /^VSSOP(\d+)/u },
    { footprinterPrefix: "soic", pattern: /^SOIC(\d+)/u },
  ]
  for (const { footprinterPrefix, pattern } of packageMatchers) {
    const pinCount = pattern.exec(normalizedFootprint)?.[1]
    if (!pinCount) continue
    const needsQuarterTurn =
      /^TSSOP10(?:_|$)/u.test(normalizedFootprint) ||
      /^VSSOP8_0D65_3X3X1_1MM/u.test(normalizedFootprint) ||
      /^SOIC8_1D27_4_9X3_9MM/u.test(normalizedFootprint)
    return createFootprinterReplacement(
      `${footprinterPrefix}${pinCount}`,
      needsQuarterTurn ? 90 : undefined,
    )
  }

  if (/^SOP8_DCT/u.test(normalizedFootprint)) {
    return createFootprinterReplacement("ssop8_p0.65mm", 90)
  }
  if (/^SO8-/u.test(normalizedFootprint)) {
    return createFootprinterReplacement("soic8_p1.27mm", 90)
  }
  return undefined
}

function getDiscretePackageReplacement(
  normalizedFootprint: string,
): CadModelReplacement | undefined {
  const exactPackageMappings: Array<[RegExp, string]> = [
    [/^BF10_/u, "dfn10_w2mm_h1.25mm_bodywidth2mm_bodylength1.25mm_p0.5mm"],
    [/^SOT23[-_]?5/u, "sot23-5"],
    [/^SOT23[-_]?6/u, "sot6"],
    [/^(?:DIO_)?(?:SOD[-_]?323|SOD323)/u, "sod323"],
    [/^(?:DIO_)?(?:SOD[-_]?523|SOD523)/u, "sod523"],
    [/^DO_214AC_SMA/u, "sma"],
    [/^(?:SOT23-123|TO_SOT23-123|SOT23$)/u, "sot23"],
  ]
  const exactMapping = exactPackageMappings.find(([pattern]) => pattern.test(normalizedFootprint))
  return exactMapping ? createFootprinterReplacement(exactMapping[1]) : undefined
}

function getBoardSpecificSmallPackageReplacement(
  normalizedFootprint: string,
): CadModelReplacement | undefined {
  if (/^EMIFIL_NFM15CC_0402/u.test(normalizedFootprint)) {
    return { kind: "jscad", jscadOperations: createEmiFilterCadModel() }
  }
  if (/^ANT2_W3006_390X130_SMD/u.test(normalizedFootprint)) {
    return { kind: "jscad", jscadOperations: createCeramicAntennaCadModel() }
  }
  if (/^POLYSW200-5638-310/u.test(normalizedFootprint)) {
    return { kind: "jscad", jscadOperations: createRadialPolyfuseCadModel() }
  }
  // These Altium pad rows face local +/-Y; the replacement leads face local +/-X.
  if (/^U_8_DCU/u.test(normalizedFootprint)) {
    return {
      kind: "step",
      modelStepUrl: externalStepModelUrls.vssop8Dcu,
      modelYawOffsetDegrees: 90,
    }
  }
  if (/^DGN-16X60/u.test(normalizedFootprint)) {
    return createFootprinterReplacement("msop8", 90)
  }

  const exactPackageMappings: Array<[RegExp, string]> = [
    [/^U_6_DRY/u, "dfn6_w1.45mm_h1mm_bodywidth1.45mm_bodylength1mm_p0.5mm"],
    [/^SOT553-5/u, "sot563"],
  ]
  const exactMapping = exactPackageMappings.find(([pattern]) => pattern.test(normalizedFootprint))
  return exactMapping ? createFootprinterReplacement(exactMapping[1]) : undefined
}

function getBallGridPackageReplacement(
  normalizedFootprint: string,
  modelLocalPads: ModelLocalPad[],
): CadModelReplacement | undefined {
  if (/^BGA425_0D5_13X13MM/u.test(normalizedFootprint)) {
    return {
      kind: "jscad",
      jscadOperations: createBgaCadModel({
        modelLocalPads,
        bodyLength: 13,
        bodyWidth: 13,
      }),
    }
  }
  if (/^BGA425_19-68_510X510/u.test(normalizedFootprint)) {
    return {
      kind: "jscad",
      jscadOperations: createBgaCadModel({
        modelLocalPads,
        bodyLength: 12.95,
        bodyWidth: 12.95,
        packageHeight: getPackageHeightMillimeters(normalizedFootprint),
      }),
    }
  }
  if (/^AM33XX_15X15/u.test(normalizedFootprint)) {
    return createBgaReplacement({ bodyLength: 15, bodyWidth: 15, modelLocalPads })
  }
  const ballGridMatch = /^(?:DSBGA|TFBGA|TPBGA|V?FBGA|BGA)(\d+)/u.exec(normalizedFootprint)
  const bodyDimensions = getPackageBodyDimensionsMillimeters(normalizedFootprint)
  if (ballGridMatch && bodyDimensions) {
    return {
      kind: "jscad",
      jscadOperations: createBgaCadModel({
        bodyLength: bodyDimensions.y,
        bodyWidth: bodyDimensions.x,
        packageHeight: getPackageHeightMillimeters(normalizedFootprint),
        modelLocalPads,
      }),
    }
  }
  if (/^BGA96_T9_P8_9X14/u.test(normalizedFootprint)) {
    return createBgaReplacement({ bodyLength: 14, bodyWidth: 9, modelLocalPads })
  }
  return undefined
}

function createBgaReplacement(params: {
  bodyLength: number
  bodyWidth: number
  modelLocalPads: ModelLocalPad[]
}): CadModelReplacement {
  return {
    kind: "jscad",
    jscadOperations: createBgaCadModel(params),
  }
}

function getQuadFlatPackageReplacement(
  normalizedFootprint: string,
  modelLocalPads: ModelLocalPad[],
): CadModelReplacement | undefined {
  const quadFlatMatch = /^(?:TQFP|LQFP|QFP)(\d+)/u.exec(normalizedFootprint)
  const bodyDimensions = getPackageBodyDimensionsMillimeters(normalizedFootprint)
  if (!quadFlatMatch || !bodyDimensions) return undefined
  return {
    kind: "jscad",
    jscadOperations: createQfpCadModel({
      bodyLength: bodyDimensions.y,
      bodyWidth: bodyDimensions.x,
      packageHeight: getPackageHeightMillimeters(normalizedFootprint),
      modelLocalPads,
    }),
  }
}

function getLandGridPackageReplacement(
  normalizedFootprint: string,
  modelLocalPads: ModelLocalPad[],
): CadModelReplacement | undefined {
  const landGridMatch = /^E-(\d+)_(\d+)X(\d+)_(\d+)-N(\d+)/u.exec(normalizedFootprint)
  if (!landGridMatch) return undefined
  return {
    kind: "jscad",
    jscadOperations: createBgaCadModel({
      bodyLength: Number(`${landGridMatch[3]}.${landGridMatch[4]}`),
      bodyWidth: Number(`${landGridMatch[1]}.${landGridMatch[2]}`),
      modelLocalPads,
    }),
  }
}

export function getStandardPackageCadModelReplacement(
  componentIdentity: CadModelComponentIdentity,
  modelLocalPads: ModelLocalPad[] = [],
): CadModelReplacement | undefined {
  const normalizedFootprint = componentIdentity.altiumFootprint.trim().toUpperCase()
  return (
    getMultiTerminalResistorReplacement({ normalizedFootprint, modelLocalPads }) ??
    getLeadlessDiodeCadModelReplacement(normalizedFootprint, modelLocalPads) ??
    getIndicatorLedReplacement(componentIdentity, modelLocalPads) ??
    getTwoTerminalPackageReplacement(componentIdentity, modelLocalPads) ??
    getSmallTransistorCadModelReplacement(normalizedFootprint) ??
    getRegisteredLeadedPackageReplacement(normalizedFootprint) ??
    getSmallOutlinePackageReplacement(normalizedFootprint) ??
    getLeadlessPackageReplacement(normalizedFootprint, modelLocalPads) ??
    getDiscretePackageReplacement(normalizedFootprint) ??
    getBoardSpecificSmallPackageReplacement(normalizedFootprint) ??
    getBallGridPackageReplacement(normalizedFootprint, modelLocalPads) ??
    getQuadFlatPackageReplacement(normalizedFootprint, modelLocalPads) ??
    getLandGridPackageReplacement(normalizedFootprint, modelLocalPads) ??
    getSwitchCadModelReplacement(componentIdentity, modelLocalPads) ??
    getDimensionedMechanicalPackageReplacement(componentIdentity, modelLocalPads)
  )
}
