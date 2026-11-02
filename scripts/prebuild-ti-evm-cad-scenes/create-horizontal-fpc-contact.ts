import type { JscadOperation } from "jscad-planner"
import type { ModelLocalPad } from "./get-model-local-pads"
import { connectorModelColors, createColoredCuboid } from "./jscad-model-primitives"

// The solder tail ends at Z=.15 mm; the embedded strap and spring meet it.
export function createHorizontalFpcContact({
  pad,
  pitch,
  depth,
}: {
  pad: ModelLocalPad
  pitch: number
  depth: number
}): JscadOperation[] {
  const springCenterY = -depth / 2 + 0.9
  const springRearY = springCenterY + 0.525
  const contactWidth = Math.min(pitch * 0.48, 0.28)
  return [
    createColoredCuboid({
      center: [pad.x, (pad.y + springRearY) / 2, 0.225],
      color: connectorModelColors.gold,
      size: [contactWidth, Math.abs(pad.y - springRearY) + 0.15, 0.15],
    }),
    createColoredCuboid({
      center: [pad.x, springRearY, 0.43],
      color: connectorModelColors.gold,
      size: [contactWidth, 0.15, 0.26],
    }),
    createColoredCuboid({
      center: [pad.x, springCenterY, 0.62],
      color: connectorModelColors.gold,
      size: [contactWidth, 1.2, 0.12],
    }),
  ]
}
