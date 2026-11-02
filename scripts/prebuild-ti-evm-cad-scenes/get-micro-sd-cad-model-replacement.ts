import { applyToPoint, rotateDEG } from "transformation-matrix"
import type { CadModelComponentIdentity, CadModelReplacement } from "./get-cad-model-replacement"
import type { ModelLocalPad } from "./get-model-local-pads"
import { createMicroSdConnectorCadModel } from "./create-micro-sd-connector-cad-model"

export function getMicroSdCadModelReplacement(
  componentIdentity: CadModelComponentIdentity,
  modelLocalPads: ModelLocalPad[],
): CadModelReplacement | undefined {
  const footprint = componentIdentity.altiumFootprint.toUpperCase()
  if (!/MEM2051|MICRO_SD|SD-MICRO/u.test(footprint)) return undefined
  const modelYawOffsetDegrees = footprint.startsWith("MICRO_SD_") ? 90 : 0
  // Undo the socket's package-axis offset before applying it to the whole model.
  // Solder tails must stay at the imported lands when that offset is restored.
  const packageToSocketTransform = rotateDEG(-modelYawOffsetDegrees)
  const socketLocalPads = modelLocalPads.map((pad) => ({
    ...pad,
    ...applyToPoint(packageToSocketTransform, pad),
    ccwRotationDegrees: pad.ccwRotationDegrees - modelYawOffsetDegrees,
  }))
  return {
    kind: "jscad",
    modelYawOffsetDegrees,
    jscadOperations: createMicroSdConnectorCadModel(socketLocalPads),
  }
}
