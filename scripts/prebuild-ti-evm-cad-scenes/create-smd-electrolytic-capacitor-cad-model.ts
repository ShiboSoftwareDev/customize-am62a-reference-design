import type { JscadOperation } from "jscad-planner"
import {
  colorize,
  connectorModelColors,
  createColoredCuboid,
  createColoredCylinder,
  translate,
} from "./jscad-model-primitives"

// CDE AVE case D: 6.3 mm can, 6.6 mm base, 5.3 mm seated height.
// Terminals run along local X at Z=0; pin 1 is on -X in RD205SMD_250D.
export function createSmdElectrolyticCapacitorCadModel(): JscadOperation[] {
  return [
    colorize(
      connectorModelColors.blackPlastic,
      translate([0, 0, 0.15], {
        type: "extrudeLinear",
        options: { height: 0.4 },
        shape: {
          type: "fromPointsGeom2",
          points: [
            [-3.3, -2.5],
            [-2.5, -3.3],
            [3.3, -3.3],
            [3.3, 3.3],
            [-2.5, 3.3],
            [-3.3, 2.5],
          ],
        },
      }),
    ),
    createColoredCylinder({
      center: [0, 0, 2.875],
      color: connectorModelColors.metal,
      height: 4.65,
      radius: 3.15,
    }),
    createColoredCylinder({
      center: [0, 0, 5.245],
      color: connectorModelColors.silver,
      height: 0.09,
      radius: 3.1,
    }),
    createColoredCuboid({
      center: [2.2, 0, 5.295],
      color: connectorModelColors.blackPlastic,
      size: [0.45, 3.5, 0.01],
    }),
    ...[-1, 1].map((side) =>
      createColoredCuboid({
        center: [side * 2.35, 0, 0.075],
        color: connectorModelColors.silver,
        size: [2.7, 0.65, 0.15],
      }),
    ),
  ]
}
