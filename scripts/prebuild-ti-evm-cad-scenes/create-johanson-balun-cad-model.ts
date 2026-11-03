import type { JscadOperation } from "jscad-planner"
import {
  colorize,
  connectorModelColors,
  createColoredCuboid,
  subtract,
} from "./jscad-model-primitives"

// Johanson 0900PC15A0036 drawing: local X is the 2 mm length, Y the
// 1.25 mm width, and Z=0 the seated plane. Pins follow the bottom-view
// numbering, expressed in the model's top-view XY frame for registration.
export const johansonBalunPinPositions = [
  { pinNumber: "1", x: -0.75, y: -0.625 },
  { pinNumber: "2", x: -0.25, y: -0.625 },
  { pinNumber: "3", x: 0.25, y: -0.625 },
  { pinNumber: "4", x: 0.75, y: -0.625 },
  { pinNumber: "5", x: 1, y: 0 },
  { pinNumber: "6", x: 0.75, y: 0.625 },
  { pinNumber: "7", x: 0.25, y: 0.625 },
  { pinNumber: "8", x: -0.25, y: 0.625 },
  { pinNumber: "9", x: -0.75, y: 0.625 },
  { pinNumber: "10", x: -1, y: 0 },
]

export function createJohansonBalunCadModel(): JscadOperation[] {
  const electrodes = [
    ...[-1, 1].flatMap((sideY) =>
      [-0.75, -0.25, 0.25, 0.75].map((centerX) =>
        createColoredCuboid({
          center: [centerX, sideY * 0.525, 0.5],
          size: [0.25, 0.2, 1],
          color: connectorModelColors.metal,
        }),
      ),
    ),
    ...[-1, 1].map((sideX) =>
      createColoredCuboid({
        center: [sideX * 0.9, 0, 0.5],
        size: [0.2, 0.3, 1],
        color: connectorModelColors.metal,
      }),
    ),
  ]
  const ceramicColor: [number, number, number] = [0.73, 0.38, 0.12]
  const orientationMark = createColoredCuboid({
    center: [-0.45, 0, 0.995],
    size: [0.35, 0.4, 0.01],
    color: [0.2, 0.45, 0.15],
  })
  const body = createColoredCuboid({
    center: [0, 0, 0.5],
    size: [2, 1.25, 1],
    color: ceramicColor,
  })
  return [
    colorize(ceramicColor, subtract([body, ...electrodes, orientationMark])),
    ...electrodes,
    orientationMark,
  ]
}
