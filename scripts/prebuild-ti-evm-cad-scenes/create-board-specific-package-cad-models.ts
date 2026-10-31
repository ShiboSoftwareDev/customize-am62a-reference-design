import type { Color, JscadOperation } from "jscad-planner"
import {
  connectorModelColors,
  createColoredCuboid,
  createColoredCylinder,
  createColoredRoundedCuboid,
} from "./jscad-model-primitives"

const ceramicBody = [0.78, 0.72, 0.58] as Color
const polyfuseBody = [0.82, 0.56, 0.08] as Color

export function createCeramicAntennaCadModel(): JscadOperation[] {
  return [
    createColoredRoundedCuboid({
      center: [0, 0, 0.4],
      color: connectorModelColors.whitePlastic,
      roundRadius: 0.18,
      size: [3.9, 1.3, 0.8],
    }),
    ...[-1, 1].map((side) =>
      createColoredCuboid({
        center: [side * 1.7, 0, 0.2],
        color: connectorModelColors.silver,
        size: [0.5, 1.32, 0.22],
      }),
    ),
  ]
}

export function createEmiFilterCadModel(): JscadOperation[] {
  return [
    createColoredRoundedCuboid({
      center: [0, 0, 0.18],
      color: ceramicBody,
      roundRadius: 0.06,
      size: [0.62, 0.5, 0.34],
    }),
    ...[-1, 0, 1].map((terminalIndex) =>
      createColoredCuboid({
        center: [terminalIndex * 0.37, 0, 0.1],
        color: connectorModelColors.silver,
        size: [0.16, 0.5, 0.2],
      }),
    ),
  ]
}

export function createRadialPolyfuseCadModel(): JscadOperation[] {
  return [
    createColoredCylinder({
      center: [0, 0, 3.5],
      color: polyfuseBody,
      height: 1.1,
      radius: 3.2,
      rotation: [Math.PI / 2, 0, 0],
    }),
    ...[-1, 1].map((side) =>
      createColoredCylinder({
        center: [side * 1.25, 0, 1.25],
        color: connectorModelColors.metal,
        height: 2.5,
        radius: 0.22,
      }),
    ),
  ]
}
