import type { CadModelReplacement } from "./get-cad-model-replacement"
import type { ModelLocalPad } from "./get-model-local-pads"
import { alignTwoTerminalCadModel } from "./align-two-terminal-cad-model"
import { connectorModelColors, createColoredCuboid } from "./jscad-model-primitives"

type LeadlessDiodeDimensions = {
  length: number
  width: number
  height: number
  terminalLength: number
  terminalWidth: number
  terminalPitch: number
}

export function getLeadlessDiodeCadModelReplacement(
  normalizedFootprint: string,
  modelLocalPads: ModelLocalPad[],
): CadModelReplacement | undefined {
  const dimensions = getLeadlessDiodeDimensions(normalizedFootprint)
  if (!dimensions) return undefined
  // Package-local +Z points away from the mounting plane at Z=0. These TI
  // DPL/DPY packages expose two end contacts, without a separate center pad.
  const terminalThickness = 0.03
  return {
    kind: "jscad",
    jscadOperations: alignTwoTerminalCadModel({
      modelLocalPads,
      jscadOperations: [
        createColoredCuboid({
          center: [0, 0, (dimensions.height + terminalThickness) / 2],
          size: [dimensions.length, dimensions.width, dimensions.height - terminalThickness],
          color: connectorModelColors.blackPlastic,
        }),
        ...[-1, 1].map((side) =>
          createColoredCuboid({
            center: [(side * dimensions.terminalPitch) / 2, 0, terminalThickness / 2],
            size: [dimensions.terminalLength, dimensions.terminalWidth, terminalThickness],
            color: connectorModelColors.metal,
          }),
        ),
      ],
    }),
  }
}

function getLeadlessDiodeDimensions(
  normalizedFootprint: string,
): LeadlessDiodeDimensions | undefined {
  // TI DPL drawing 4212149/B: 0.6 x 0.3 mm nominal body, 0.32 mm maximum
  // seated height, 0.35 mm terminal pitch and nominal 0.185 x 0.25 mm contacts.
  if (normalizedFootprint.startsWith("DIO_DFN0201_")) {
    return {
      length: 0.6,
      width: 0.3,
      height: 0.32,
      terminalLength: 0.185,
      terminalWidth: 0.25,
      terminalPitch: 0.35,
    }
  }
  // The TI-library DPY footprint allows 0.5 mm height; BeaglePlay records
  // the newer 0.45 mm DPY envelope. Both use 0.65 mm terminal pitch.
  let height: number
  if (normalizedFootprint.startsWith("DIO_DFN0402_")) height = 0.5
  else if (normalizedFootprint === "X1SON2_0D65_1X0_6X0_45MM") height = 0.45
  else return undefined
  return {
    length: 1,
    width: 0.6,
    height,
    terminalLength: 0.25,
    terminalWidth: 0.5,
    terminalPitch: 0.65,
  }
}
