import type { CadModelReplacement } from "./get-cad-model-replacement"
import { externalStepModelUrls } from "./external-cad-model-urls"
import { createSot523CadModel } from "./create-sot523-cad-model"

// Pin centers match the KiCad Package_TO_SOT_SMD footprints.
// KiCad footprint Y points down; model/package Y points up.
export function getSmallTransistorCadModelReplacement(
  normalizedFootprint: string,
): CadModelReplacement | undefined {
  let modelStepUrl: string
  let modelPinPositions: Array<{ x: number; y: number; pinNumber: string }>
  if (/^SOT[-_]?323(?:-|_|$)/u.test(normalizedFootprint)) {
    modelStepUrl = externalStepModelUrls.sot323
    modelPinPositions = [
      { pinNumber: "1", x: -1, y: 0.65 },
      { pinNumber: "2", x: -1, y: -0.65 },
      { pinNumber: "3", x: 1, y: 0 },
    ]
  } else if (/^SOT[-_]?523(?:-|_|$)/u.test(normalizedFootprint)) {
    modelPinPositions = [
      { pinNumber: "1", x: -0.645, y: 0.5 },
      { pinNumber: "2", x: -0.645, y: -0.5 },
      { pinNumber: "3", x: 0.645, y: 0 },
    ]
    return {
      kind: "jscad",
      jscadOperations: createSot523CadModel(modelPinPositions),
      modelPinPositions,
      modelOriginPosition: { x: 0, y: 0, z: 0 },
    }
  } else if (/^SMINI6-/u.test(normalizedFootprint)) {
    modelStepUrl = externalStepModelUrls.sot363
    modelPinPositions = [
      { pinNumber: "1", x: -0.95, y: 0.65 },
      { pinNumber: "2", x: -0.95, y: 0 },
      { pinNumber: "3", x: -0.95, y: -0.65 },
      { pinNumber: "4", x: 0.95, y: -0.65 },
      { pinNumber: "5", x: 0.95, y: 0 },
      { pinNumber: "6", x: 0.95, y: 0.65 },
    ]
  } else {
    return undefined
  }
  return {
    kind: "step",
    modelStepUrl,
    modelPinPositions,
    modelOriginPosition: { x: 0, y: 0, z: 0 },
  }
}
