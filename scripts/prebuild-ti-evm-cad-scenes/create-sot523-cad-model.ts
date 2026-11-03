import type { JscadOperation } from "jscad-planner"
import {
  colorize,
  connectorModelColors,
  createColoredCylinder,
  createColoredRoundedCuboid,
  translate,
} from "./jscad-model-primitives"

// Diodes SOT523 package drawing: 0.8 x 1.6 mm body, 0.75 mm body
// height, 0.05 mm standoff, 0.22 mm leads and 0.5 mm pin pitch.
// https://www.diodes.com/assets/Package-Files/SOT523.pdf
export function createSot523CadModel(
  modelPinPositions: Array<{ x: number; y: number }>,
): JscadOperation[] {
  return [
    createColoredRoundedCuboid({
      center: [0, 0, 0.425],
      color: connectorModelColors.blackPlastic,
      roundRadius: 0.06,
      size: [0.8, 1.6, 0.75],
    }),
    createColoredCylinder({
      center: [-0.18, 0.52, 0.805],
      color: connectorModelColors.metal,
      height: 0.02,
      radius: 0.08,
    }),
    ...modelPinPositions.map(createSot523Lead),
  ]
}

function createSot523Lead(pinPosition: { x: number; y: number }): JscadOperation {
  return colorize(
    connectorModelColors.silver,
    translate([0, pinPosition.y, 0], {
      type: "rotate",
      angles: [0, 0, pinPosition.x < 0 ? Math.PI : 0],
      shape: translate([0, 0.11, 0], {
        type: "rotate",
        angles: [Math.PI / 2, 0, 0],
        shape: {
          type: "extrudeLinear",
          options: { height: 0.22 },
          shape: {
            type: "fromPointsGeom2",
            // XZ profile: from the body lead exit down to the solder foot.
            points: [
              [0.3, 0.32],
              [0.43, 0.32],
              [0.58, 0.12],
              [0.8, 0.12],
              [0.8, 0],
              [0.52, 0],
              [0.38, 0.2],
              [0.3, 0.2],
            ],
          },
        },
      }),
    }),
  )
}
