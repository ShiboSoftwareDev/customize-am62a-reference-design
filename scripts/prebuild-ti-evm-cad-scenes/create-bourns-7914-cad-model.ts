import type { JscadOperation } from "jscad-planner"
import {
  colorize,
  connectorModelColors,
  createColoredCuboid,
  createColoredCylinder,
  translate,
} from "./jscad-model-primitives"

// Bourns 7914G-1-000E: package XY is centered between the four lands;
// local Z=0 is the mounting plane. The 2.54 mm lid plus the 1.65 mm
// standard actuator gives 4.19 mm seated height. Lead pitch is 2.54 x 5.5 mm.
// https://www.bourns.com/docs/product-datasheets/7914.pdf
export function createBourns7914CadModel(): JscadOperation[] {
  return [
    createColoredCuboid({
      center: [0, 0, 0.44],
      size: [5, 5, 0.32],
      color: connectorModelColors.blackPlastic,
    }),
    createColoredCuboid({
      center: [0, 0, 1.57],
      size: [4.5, 4.5, 1.94],
      color: connectorModelColors.metal,
    }),
    createColoredCylinder({
      center: [0, 0, 3.365],
      height: 1.65,
      radius: 2.39 / 2,
      color: connectorModelColors.blackPlastic,
    }),
    ...[-1.27, 1.27].flatMap((x) => [-1, 1].map((sideY) => createGullWingLead({ x, sideY }))),
  ]
}

function createGullWingLead({ x, sideY }: { x: number; sideY: number }): JscadOperation {
  return colorize(
    connectorModelColors.silver,
    translate([x, 0, 0], {
      type: "rotate",
      angles: [0, 0, (sideY * Math.PI) / 2],
      shape: translate([0, 0.38, 0], {
        type: "rotate",
        angles: [Math.PI / 2, 0, 0],
        shape: {
          type: "extrudeLinear",
          options: { height: 0.76 },
          shape: {
            type: "fromPointsGeom2",
            // Outward-distance/Z profile, extruded across each 0.76 mm lead.
            points: [
              [1.95, 0.8],
              [2.3, 0.8],
              [2.6, 0.2],
              [3.1, 0.2],
              [3.1, 0],
              [2.5, 0],
              [2.2, 0.6],
              [1.95, 0.6],
            ],
          },
        },
      }),
    }),
  )
}
