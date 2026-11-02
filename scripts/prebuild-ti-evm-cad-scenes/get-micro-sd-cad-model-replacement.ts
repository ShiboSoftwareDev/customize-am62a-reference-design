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
  const modelYawOffsetDegrees = getMicroSdModelYawOffsetDegrees({ footprint, modelLocalPads })
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

function getMicroSdModelYawOffsetDegrees({
  footprint,
  modelLocalPads,
}: {
  footprint: string
  modelLocalPads: ModelLocalPad[]
}): number {
  if (footprint.startsWith("MICRO_SD_")) return 90
  if (!footprint.includes("MEM2051")) return 0
  const pin1 = modelLocalPads.find((pad) => pad.pinNumber === "1")
  const pin8 = modelLocalPads.find((pad) => pad.pinNumber === "8")
  if (!pin1 || !pin8) return 0
  // The MEM2051 package has pin 1 toward +X and card entry toward -Y.
  // Resolve its axis from the numbered lands, including mirrored bottom pads.
  const ccwRotationDegrees = (Math.atan2(pin1.y - pin8.y, pin1.x - pin8.x) * 180) / Math.PI
  return (ccwRotationDegrees + 360) % 360
}
