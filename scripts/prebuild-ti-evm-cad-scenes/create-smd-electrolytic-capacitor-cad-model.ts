import type { JscadOperation } from "jscad-planner"
import {
  colorize,
  connectorModelColors,
  createColoredCuboid,
  createColoredCylinder,
  translate,
} from "./jscad-model-primitives"

// Dimensions are in millimeters. Terminals run along local X at Z=0,
// with the negative polarity mark on +X. Defaults are CDE AVE case D.
export function createSmdElectrolyticCapacitorCadModel({
  canDiameter = 6.3,
  baseSize = 6.6,
  seatedHeight = 5.3,
  terminalGap = 2,
  terminalLength = 2.7,
  terminalWidth = 0.65,
}: {
  canDiameter?: number
  baseSize?: number
  seatedHeight?: number
  terminalGap?: number
  terminalLength?: number
  terminalWidth?: number
} = {}): JscadOperation[] {
  const halfBase = baseSize / 2
  const canHeight = seatedHeight - 0.65
  return [
    colorize(
      connectorModelColors.blackPlastic,
      translate([0, 0, 0.15], {
        type: "extrudeLinear",
        options: { height: 0.4 },
        shape: {
          type: "fromPointsGeom2",
          points: [
            [-halfBase, -halfBase + 0.8],
            [-halfBase + 0.8, -halfBase],
            [halfBase, -halfBase],
            [halfBase, halfBase],
            [-halfBase + 0.8, halfBase],
            [-halfBase, halfBase - 0.8],
          ],
        },
      }),
    ),
    createColoredCylinder({
      center: [0, 0, 0.55 + canHeight / 2],
      color: connectorModelColors.metal,
      height: canHeight,
      radius: canDiameter / 2,
    }),
    createColoredCylinder({
      center: [0, 0, seatedHeight - 0.055],
      color: connectorModelColors.silver,
      height: 0.09,
      radius: canDiameter / 2 - 0.05,
    }),
    createColoredCuboid({
      center: [canDiameter / 2 - 0.95, 0, seatedHeight - 0.005],
      color: connectorModelColors.blackPlastic,
      size: [0.45, 3.5, 0.01],
    }),
    ...[-1, 1].map((side) =>
      createColoredCuboid({
        center: [(side * (terminalGap + terminalLength)) / 2, 0, 0.075],
        color: connectorModelColors.silver,
        size: [terminalLength, terminalWidth, 0.15],
      }),
    ),
  ]
}
