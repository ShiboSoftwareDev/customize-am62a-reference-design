import type { JscadOperation } from "jscad-planner"
import type { ModelLocalPad } from "./get-model-local-pads"
import { translate } from "./jscad-model-primitives"

// Imported lands are already in package-local XY, including bottom-side mirroring.
// Symmetric two-terminal packages place their long axis through the land centers.
export function alignTwoTerminalCadModel({
  jscadOperations,
  modelLocalPads,
}: {
  jscadOperations: JscadOperation[]
  modelLocalPads: ModelLocalPad[]
}): JscadOperation[] {
  if (modelLocalPads.length !== 2) return jscadOperations
  const [firstPad, secondPad] = modelLocalPads
  if (!firstPad || !secondPad) return jscadOperations
  let ccwRotationRadians = Math.atan2(secondPad.y - firstPad.y, secondPad.x - firstPad.x)
  // Either end is equivalent; avoid unnecessary half-turns of symmetric bodies.
  if (ccwRotationRadians > Math.PI / 2) ccwRotationRadians -= Math.PI
  if (ccwRotationRadians < -Math.PI / 2) ccwRotationRadians += Math.PI
  return jscadOperations.map((shape) =>
    translate([(firstPad.x + secondPad.x) / 2, (firstPad.y + secondPad.y) / 2, 0], {
      type: "rotate",
      angles: [0, 0, ccwRotationRadians],
      shape,
    }),
  )
}
