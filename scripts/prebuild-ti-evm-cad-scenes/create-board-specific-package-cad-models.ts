import type { Color, JscadOperation } from "jscad-planner"
import {
  colorize,
  connectorModelColors,
  createColoredCuboid,
  createColoredCylinder,
  createColoredRoundedCuboid,
  subtract,
} from "./jscad-model-primitives"

const ceramicBody = [0.78, 0.72, 0.58] as Color
const polyfuseBody = [0.82, 0.56, 0.08] as Color

export function createCeramicAntennaCadModel(): JscadOperation[] {
  const body = createColoredRoundedCuboid({
    center: [0, 0, 0.75],
    color: connectorModelColors.whitePlastic,
    roundRadius: 0.18,
    // Pulse W3006: 10 x 3.2 x 1.5 mm; 390x130 in the footprint is mils.
    size: [10, 3.2, 1.5],
  })
  const terminals = [-1, 1].map((side) =>
    createColoredCuboid({
      center: [side * 4.6, 0, 0.15],
      color: connectorModelColors.silver,
      size: [0.8, 3.2, 0.3],
    }),
  )
  return [colorize(connectorModelColors.whitePlastic, subtract([body, ...terminals])), ...terminals]
}

export function createEmiFilterCadModel(): JscadOperation[] {
  // Murata NFM15CC: X follows the 1 mm package length, and Z=0 is the PCB seat.
  // The two ground electrodes wrap around opposite sides with ceramic between them.
  const body = createColoredCuboid({
    center: [0, 0, 0.2],
    color: ceramicBody,
    size: [1, 0.5, 0.4],
  })
  const electrodes = [-1, 1].flatMap((side) => [
    createColoredCuboid({
      center: [side * 0.415, 0, 0.2],
      color: connectorModelColors.silver,
      size: [0.17, 0.5, 0.4],
    }),
    createColoredCuboid({
      center: [0, side * 0.175, 0.2],
      color: connectorModelColors.silver,
      size: [0.35, 0.15, 0.4],
    }),
  ])
  return [colorize(ceramicBody, subtract([body, ...electrodes])), ...electrodes]
}

export function createRadialPolyfuseCadModel(): JscadOperation[] {
  return [
    createColoredCylinder({
      center: [0, 0, 4.3],
      color: polyfuseBody,
      height: 1.1,
      radius: 3.2,
      rotation: [Math.PI / 2, 0, 0],
    }),
    ...[-1, 1].flatMap((side) => [
      createColoredCylinder({
        // RXEF010 leads are formed into the staggered 5.08 x 2.54 mm
        // POLYSW200-5638-310 footprint; the disc itself remains upright.
        center: [side * 2.54, -side * 1.27, -0.55],
        color: connectorModelColors.metal,
        height: 4.6,
        radius: 0.255,
      }),
      createColoredCylinder({
        center: [side * 2.54, -side * 0.86, 2.375],
        color: connectorModelColors.metal,
        height: Math.hypot(0.82, 1.25),
        radius: 0.255,
        rotation: [-side * Math.atan2(0.82, 1.25), 0, 0],
      }),
    ]),
  ]
}
