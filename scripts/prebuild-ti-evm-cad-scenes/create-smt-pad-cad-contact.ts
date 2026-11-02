import type { Color, JscadOperation } from "jscad-planner"
import type { ModelLocalPad } from "./get-model-local-pads"
import { createColoredCuboid } from "./jscad-model-primitives"

// Pads are in the package's local XY frame, with its mounting plane at Z=0 mm.
export function createSmtPadCadContact(pad: ModelLocalPad, color: Color): JscadOperation {
  return {
    type: "translate",
    vector: [pad.x, pad.y, 0],
    shape: {
      type: "rotate",
      angles: [0, 0, (pad.ccwRotationDegrees * Math.PI) / 180],
      shape: createColoredCuboid({
        center: [0, 0, 0.075],
        color,
        size: [pad.width * 0.75, pad.height * 0.75, 0.15],
      }),
    },
  }
}
