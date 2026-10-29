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
): CadModelReplacement | undefined {
  const imperialPackageSize = getImperialPackageSize(componentIdentity.altiumFootprint)
  if (!imperialPackageSize) return undefined

  if (componentIdentity.componentName.startsWith("C")) {
    return createTwoTerminalReplacement("capacitor", imperialPackageSize)
  }
  if (/^(?:R|L|FB|FL|F)/u.test(componentIdentity.componentName)) {
    const kind = componentIdentity.componentName.startsWith("R") ? "resistor" : "inductor"
    return createTwoTerminalReplacement(kind, imperialPackageSize)
  }
  if (componentIdentity.componentName.startsWith("LED")) {
    return createTwoTerminalReplacement("led", imperialPackageSize)
  }
  if (componentIdentity.componentName.startsWith("D")) {
    return createTwoTerminalReplacement("diode", imperialPackageSize)
  }
  return undefined
}

function createTwoTerminalReplacement(
  kind: TwoTerminalPackageKind,
  packageSize: ImperialPackageSize,
): CadModelReplacement {
  return {
    kind: "jscad",
    jscadOperations: createTwoTerminalCadModel({ kind, packageSize }),
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
      /^VSSOP8_0D65_3X3X1_1MM/u.test(normalizedFootprint)
    return createFootprinterReplacement(
      `${footprinterPrefix}${pinCount}`,
      needsQuarterTurn ? 90 : undefined,
    )
  }

  if (/^SOP8_DCT/u.test(normalizedFootprint)) {
    return createFootprinterReplacement("ssop8_p0.65mm")
  }
  if (/^SO8-/u.test(normalizedFootprint)) {
    return createFootprinterReplacement("soic8_p1.27mm")
  }
  return undefined
}

function getLeadlessPackageReplacement(
  normalizedFootprint: string,
): CadModelReplacement | undefined {
  const qfnPinCount = /^(?:U?QFN|VQFN(?:HR)?|WQFN)(\d+)/u.exec(normalizedFootprint)?.[1]
  if (qfnPinCount) {
    const dimensionsMillimeters = getPackageBodyDimensionsMillimeters(normalizedFootprint)
    const dimensionsToken = dimensionsMillimeters
      ? `_w${dimensionsMillimeters.x}mm_h${dimensionsMillimeters.y}mm`
      : ""
    return createFootprinterReplacement(`qfn${qfnPinCount}${dimensionsToken}`)
  }

  const sonMatch = /^(?:X[12]SON|U?SON|UDFN|WSON|VSON(?:HR)?)(\d+)/u.exec(normalizedFootprint)
  if (sonMatch) {
    const dimensionsMillimeters = getPackageBodyDimensionsMillimeters(normalizedFootprint)
    const dimensionsToken = dimensionsMillimeters
      ? `_w${dimensionsMillimeters.x}mm_h${dimensionsMillimeters.y}mm_bodywidth${dimensionsMillimeters.x}mm_bodylength${dimensionsMillimeters.y}mm`
      : ""
    const pinPitchMillimeters = Number(sonMatch[1]) <= 5 ? 0.4 : 0.5
    return createFootprinterReplacement(
      `dfn${sonMatch[1]}${dimensionsToken}_p${pinPitchMillimeters}mm`,
    )
  }
  return undefined
}

function getDiscretePackageReplacement(
  normalizedFootprint: string,
): CadModelReplacement | undefined {
  if (/^DIO_DFN0201/u.test(normalizedFootprint)) {
    return createFootprinterReplacement(
      "dfn2_w0.65mm_h0.4mm_bodywidth0.65mm_bodylength0.4mm_p0.4mm",
    )
  }
  if (/^DIO_DFN0402/u.test(normalizedFootprint)) {
    return createFootprinterReplacement("dfn2_w1mm_h0.6mm_bodywidth1mm_bodylength0.6mm_p0.5mm")
  }
  const exactPackageMappings: Array<[RegExp, string]> = [
    [/^BF10_/u, "dfn10_w2mm_h1.25mm_bodywidth2mm_bodylength1.25mm_p0.5mm"],
    [/^SOT23[-_]?5/u, "sot23-5"],
    [/^SOT23[-_]?6/u, "sot6"],
    [/^(?:SOT[-_]?323|SOT323)/u, "sot323"],
    [/^(?:SOT[-_]?523|SOT523)/u, "sot723"],
    [/^(?:DIO_)?(?:SOD[-_]?323|SOD323)/u, "sod323"],
    [/^(?:DIO_)?(?:SOD[-_]?523|SOD523)/u, "sod523"],
    [/^DO_214AC_SMA/u, "sma"],
    [/^(?:SOT23-123|TO_SOT23-123|SOT23$)/u, "sot23"],
    [/^SC70-5/u, "sot23-5"],
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

  const exactPackageMappings: Array<[RegExp, string]> = [
    [/^U_8_DCU/u, "vssop8"],
    [/^U_6_DRY/u, "dfn6_w1.45mm_h1mm_bodywidth1.45mm_bodylength1mm_p0.5mm"],
    [/^DGN-16X60/u, "msop8"],
    [/^DCK5_/u, "sot23-5"],
    [/^SMINI6-/u, "sot363"],
    [/^SOT553-5/u, "sot563"],
    [/^TVSOP14/u, "tssop14"],
  ]
  const exactMapping = exactPackageMappings.find(([pattern]) => pattern.test(normalizedFootprint))
  return exactMapping ? createFootprinterReplacement(exactMapping[1]) : undefined
}

function getBallGridPackageReplacement(
  normalizedFootprint: string,
): CadModelReplacement | undefined {
  if (/^BGA425_0D5_13X13MM/u.test(normalizedFootprint)) {
    return {
      kind: "jscad",
      jscadOperations: createBgaCadModel({
        ballColumnCount: 25,
        ballRowCount: 17,
        bodyLength: 13,
        bodyWidth: 13,
        pinCount: 425,
      }),
    }
  }
  if (/^BGA425_19-68_510X510/u.test(normalizedFootprint)) {
    return {
      kind: "jscad",
      jscadOperations: createBgaCadModel({
        ballColumnCount: 25,
        ballRowCount: 17,
        bodyLength: 12.95,
        bodyWidth: 12.95,
        pinCount: 425,
      }),
    }
  }
  if (/^BGA96_T9_P8_/u.test(normalizedFootprint)) {
    return createBgaReplacement({ bodyLength: 14, bodyWidth: 9, pinCount: 96 })
  }
  if (/^AM33XX_15X15/u.test(normalizedFootprint)) {
    return createBgaReplacement({ bodyLength: 15, bodyWidth: 15, pinCount: 324 })
  }
  const ballGridMatch = /^(?:DSBGA|TFBGA|TPBGA|V?FBGA|BGA)(\d+)/u.exec(normalizedFootprint)
  const bodyDimensions = getPackageBodyDimensionsMillimeters(normalizedFootprint)
  if (ballGridMatch && bodyDimensions) {
    return {
      kind: "jscad",
      jscadOperations: createBgaCadModel({
        bodyLength: bodyDimensions.y,
        bodyWidth: bodyDimensions.x,
        pinCount: Number(ballGridMatch[1]),
      }),
    }
  }
  return undefined
}

function createBgaReplacement(params: {
  bodyLength: number
  bodyWidth: number
  pinCount: number
}): CadModelReplacement {
  return {
    kind: "jscad",
    jscadOperations: createBgaCadModel(params),
  }
}

function getQuadFlatPackageReplacement(
  normalizedFootprint: string,
): CadModelReplacement | undefined {
  const quadFlatMatch = /^(?:TQFP|LQFP|QFP)(\d+)/u.exec(normalizedFootprint)
  const bodyDimensions = getPackageBodyDimensionsMillimeters(normalizedFootprint)
  if (!quadFlatMatch || !bodyDimensions) return undefined
  return {
    kind: "jscad",
    jscadOperations: createQfpCadModel({
      bodyLength: bodyDimensions.y,
      bodyWidth: bodyDimensions.x,
      pinCount: Number(quadFlatMatch[1]),
    }),
  }
}

function getLandGridPackageReplacement(
  normalizedFootprint: string,
): CadModelReplacement | undefined {
  const landGridMatch = /^E-(\d+)_(\d+)X(\d+)_(\d+)-N(\d+)/u.exec(normalizedFootprint)
  if (!landGridMatch) return undefined
  return {
    kind: "jscad",
    jscadOperations: createBgaCadModel({
      bodyLength: Number(`${landGridMatch[3]}.${landGridMatch[4]}`),
      bodyWidth: Number(`${landGridMatch[1]}.${landGridMatch[2]}`),
      pinCount: Number(landGridMatch[5]),
    }),
  }
}

export function getStandardPackageCadModelReplacement(
  componentIdentity: CadModelComponentIdentity,
): CadModelReplacement | undefined {
  const normalizedFootprint = componentIdentity.altiumFootprint.trim().toUpperCase()
  return (
    getTwoTerminalPackageReplacement(componentIdentity) ??
    getSmallOutlinePackageReplacement(normalizedFootprint) ??
    getLeadlessPackageReplacement(normalizedFootprint) ??
    getDiscretePackageReplacement(normalizedFootprint) ??
    getBoardSpecificSmallPackageReplacement(normalizedFootprint) ??
    getBallGridPackageReplacement(normalizedFootprint) ??
    getQuadFlatPackageReplacement(normalizedFootprint) ??
    getLandGridPackageReplacement(normalizedFootprint) ??
    getDimensionedMechanicalPackageReplacement(componentIdentity)
  )
}
