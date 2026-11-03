import type { JscadOperation } from "jscad-planner"
import {
  colorize,
  connectorModelColors,
  createColoredCuboid,
  createColoredCylinder,
  createColoredRoundedCuboid,
  subtract,
  translate,
} from "./jscad-model-primitives"

export function createUflConnectorCadModel(): JscadOperation[] {
  const base = createColoredRoundedCuboid({
    center: [0, 0, 0.16],
    color: connectorModelColors.silver,
    roundRadius: 0.12,
    size: [2.6, 2.6, 0.32],
  })
  const groundTabs = [-1, 1].map((side) =>
    createColoredCuboid({
      center: [side * 1.425, 0, 0.09],
      color: connectorModelColors.silver,
      size: [0.45, 1.8, 0.18],
    }),
  )
  const shell = colorize(
    connectorModelColors.silver,
    translate(
      [0, 0, 0.775],
      subtract([
        { type: "cylinder", height: 0.85, radius: 1, resolution: 32 },
        { type: "cylinder", height: 0.95, radius: 0.64, resolution: 32 },
      ]),
    ),
  )
  const dielectric = createColoredCylinder({
    center: [0, 0, 0.49],
    color: connectorModelColors.whitePlastic,
    height: 0.28,
    radius: 0.58,
  })
  const signalContact = createColoredCylinder({
    center: [0, 0, 0.72],
    color: connectorModelColors.gold,
    height: 0.36,
    radius: 0.18,
  })
  return [base, ...groundTabs, shell, dielectric, signalContact]
}

export function createAudioJackCadModel(): JscadOperation[] {
  const body = createColoredRoundedCuboid({
    center: [0, 1.2, 2.6],
    color: connectorModelColors.blackPlastic,
    roundRadius: 0.45,
    size: [6.2, 9.6, 5.2],
  })
  const outerTube: JscadOperation = {
    type: "cylinder",
    height: 2.4,
    radius: 2.55,
    resolution: 32,
  }
  const innerTube: JscadOperation = {
    type: "cylinder",
    height: 2.8,
    radius: 1.65,
    resolution: 32,
  }
  const opening = colorize(
    connectorModelColors.blackPlastic,
    translate([0, -4.65, 2.6], {
      type: "rotateX",
      angle: Math.PI / 2,
      shape: subtract([outerTube, innerTube]),
    }),
  )
  const socket = createColoredCylinder({
    center: [0, -5.9, 2.6],
    color: connectorModelColors.darkPlastic,
    height: 0.35,
    radius: 1.62,
    rotation: [Math.PI / 2, 0, 0],
  })
  const terminalTabs = [
    createColoredCuboid({
      center: [-2.7, -1.8, 0.12],
      color: connectorModelColors.metal,
      size: [1.1, 2.2, 0.24],
    }),
    createColoredCuboid({
      center: [2.7, -1.8, 0.12],
      color: connectorModelColors.metal,
      size: [1.1, 2.2, 0.24],
    }),
    createColoredCuboid({
      center: [-2.7, 3.5, 0.12],
      color: connectorModelColors.metal,
      size: [1.1, 1.6, 0.24],
    }),
    createColoredCuboid({
      center: [2.7, 3.5, 0.12],
      color: connectorModelColors.metal,
      size: [1.1, 1.6, 0.24],
    }),
  ]
  const boardGuides = [-1, 1].map((side) =>
    createColoredCylinder({
      center: [side * 1.9, 3.8, -0.45],
      color: connectorModelColors.blackPlastic,
      height: 0.9,
      radius: 0.48,
    }),
  )
  return [body, opening, socket, ...terminalTabs, ...boardGuides]
}

// Package coordinates in millimeters. Both jacks open toward -Y and seat at Z=0.
export const barrelJackPinPositions = [
  { pinNumber: "1", x: -1.651, y: 2.9972 },
  { pinNumber: "2", x: -1.651, y: -2.9972 },
  { pinNumber: "3", x: 3.048, y: 0 },
]

export function createBarrelJackCadModel(): JscadOperation[] {
  const body = createColoredRoundedCuboid({
    center: [0, 0, 5.3],
    color: connectorModelColors.blackPlastic,
    roundRadius: 0.55,
    size: [9, 13.2, 10.6],
  })
  const bore = createColoredCylinder({
    center: [0, -2.65, 5.3],
    color: connectorModelColors.darkPlastic,
    height: 10,
    radius: 2.8,
    rotation: [Math.PI / 2, 0, 0],
  })
  const pin = createColoredCylinder({
    center: [0, -1.65, 5.3],
    color: connectorModelColors.metal,
    height: 8.5,
    // PJ-102A mechanical drawing specifies a 2.0 mm center post.
    radius: 1,
    rotation: [Math.PI / 2, 0, 0],
  })
  return [
    colorize(connectorModelColors.blackPlastic, subtract([body, bore])),
    pin,
    ...barrelJackPinPositions.map(({ x, y }) =>
      createColoredCuboid({
        center: [x, y, -1.45],
        color: connectorModelColors.metal,
        size: [0.55, 0.8, 3.5],
      }),
    ),
  ]
}

export function createCoinCellHolderCadModel(): JscadOperation[] {
  const base = createColoredCylinder({
    center: [0, 0, 0.65],
    color: connectorModelColors.blackPlastic,
    height: 1.3,
    radius: 8.2,
  })
  const cell = createColoredCylinder({
    center: [0, 0, 1.35],
    color: connectorModelColors.silver,
    height: 1.4,
    radius: 6.25,
  })
  const clips = [-1, 1].map((side) =>
    createColoredCuboid({
      center: [side * 5.9, 0, 2.1],
      color: connectorModelColors.metal,
      size: [1.5, 7.8, 1.6],
    }),
  )
  return [base, cell, ...clips]
}

export const rj11PinPositions = [
  { pinNumber: "2", x: -1.905, y: 6.57504 },
  { pinNumber: "3", x: -0.635, y: 9.11504 },
  { pinNumber: "4", x: 0.635, y: 6.57504 },
  { pinNumber: "5", x: 1.905, y: 9.11504 },
]

export function createRj11ConnectorCadModel(): JscadOperation[] {
  const body = createColoredRoundedCuboid({
    center: [0, 0.25, 6.65],
    color: connectorModelColors.darkPlastic,
    roundRadius: 0.5,
    size: [13.8, 18.7, 13.3],
  })
  const opening = createColoredCuboid({
    center: [0, -5.65, 6.9],
    color: connectorModelColors.blackPlastic,
    size: [9.8, 9, 6.4],
  })
  const latchOpening = createColoredCuboid({
    center: [0, -5.65, 3.65],
    color: connectorModelColors.blackPlastic,
    size: [5.2, 9, 2.3],
  })
  const contacts = rj11PinPositions.map(({ x }) =>
    createColoredCuboid({
      center: [x, -3.9, 9.94],
      color: connectorModelColors.gold,
      size: [0.34, 6, 0.23],
    }),
  )
  const signalLeads = rj11PinPositions.map(({ x, y }) =>
    createColoredCuboid({
      center: [x, y, -1.4],
      color: connectorModelColors.metal,
      size: [0.55, 0.55, 3.4],
    }),
  )
  const shieldTabs = [-6.72998, 6.72998].map((x) =>
    createColoredCuboid({
      center: [x, 3.27508, -1.4],
      color: connectorModelColors.metal,
      size: [0.7, 1.25, 3.4],
    }),
  )
  return [
    colorize(connectorModelColors.darkPlastic, subtract([body, opening, latchOpening])),
    ...contacts,
    ...signalLeads,
    ...shieldTabs,
  ]
}
