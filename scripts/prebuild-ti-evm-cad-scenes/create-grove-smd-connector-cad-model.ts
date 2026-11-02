import type { JscadOperation } from "jscad-planner"
import {
  colorize,
  connectorModelColors,
  createColoredCuboid,
  subtract,
} from "./jscad-model-primitives"

// Seeed 320110032 / 1125R-SMT-4P, manufacturer drawing:
// https://statics3.seeedstudio.com/fusion/opl/datasheet/320110032.pdf
// Package-local +Y is the mating face; Z=0 is the solder plane.
export function createGroveSmdConnectorCadModel(): JscadOperation[] {
  const housing = colorize(
    connectorModelColors.whitePlastic,
    subtract([
      {
        type: "translate",
        vector: [0, 0.75, 2.65],
        shape: { type: "cuboid", size: [12, 7.6, 4.9] },
      },
      {
        type: "translate",
        vector: [0, 2.45, 2.55],
        shape: { type: "cuboid", size: [8.75, 6, 3.7] },
      },
      { type: "translate", vector: [0, 3.25, 4.8], shape: { type: "cuboid", size: [3.6, 3, 1] } },
    ]),
  )
  return [
    housing,
    ...[-3, -1, 1, 3].flatMap((x) => [
      createColoredCuboid({
        center: [x, -3.75, 0.1],
        color: connectorModelColors.silver,
        size: [0.5, 2, 0.2],
      }),
      createColoredCuboid({
        center: [x, -2.8, 1.35],
        color: connectorModelColors.silver,
        size: [0.5, 0.5, 2.5],
      }),
      createColoredCuboid({
        center: [x, 0, 2.55],
        color: connectorModelColors.silver,
        size: [0.5, 5.6, 0.5],
      }),
    ]),
    ...[-1, 1].map((side) =>
      createColoredCuboid({
        center: [side * 5.4, 3.65, 0.1],
        color: connectorModelColors.silver,
        size: [0.5, 2.8, 0.2],
      }),
    ),
  ]
}
