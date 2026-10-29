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

export function createMicroSdConnectorCadModel(): JscadOperation[] {
  const base = createColoredRoundedCuboid({
    center: [0, 0, 0.45],
    color: connectorModelColors.blackPlastic,
    roundRadius: 0.35,
    size: [14.8, 14.5, 0.9],
  })
  const shell = createColoredRoundedCuboid({
    center: [0, -0.4, 1.28],
    color: connectorModelColors.metal,
    roundRadius: 0.3,
    size: [14.5, 13.5, 0.75],
  })
  const cardOpening = createColoredCuboid({
    center: [0, -6.75, 1.15],
    color: connectorModelColors.darkPlastic,
    size: [10.9, 0.45, 0.65],
  })
  const contacts = Array.from({ length: 8 }, (_, contactIndex) =>
    createColoredCuboid({
      center: [-4.2 + contactIndex * 1.1, 4.4, 1.7],
      color: connectorModelColors.gold,
      size: [0.55, 2.4, 0.08],
    }),
  )
  return [base, shell, cardOpening, ...contacts]
}

export function createUflConnectorCadModel(): JscadOperation[] {
  const outer = createColoredCylinder({
    center: [0, 0, 0.62],
    color: connectorModelColors.gold,
    height: 1.24,
    radius: 1.25,
  })
  const center = createColoredCylinder({
    center: [0, 0, 0.84],
    color: connectorModelColors.darkPlastic,
    height: 0.72,
    radius: 0.48,
  })
  const signal = createColoredCylinder({
    center: [0, 0, 1.05],
    color: connectorModelColors.gold,
    height: 0.48,
    radius: 0.16,
  })
  return [outer, center, signal]
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
  return [body, opening, socket]
}

export function createBarrelJackCadModel(): JscadOperation[] {
  const body = createColoredRoundedCuboid({
    center: [0, 0.8, 5.3],
    color: connectorModelColors.blackPlastic,
    roundRadius: 0.55,
    size: [9, 13.2, 10.6],
  })
  const mouth = createColoredCylinder({
    center: [0, -6.05, 5.3],
    color: connectorModelColors.darkPlastic,
    height: 0.55,
    radius: 3.25,
    rotation: [Math.PI / 2, 0, 0],
  })
  const pin = createColoredCylinder({
    center: [0, -6.36, 5.3],
    color: connectorModelColors.metal,
    height: 1.15,
    radius: 0.62,
    rotation: [Math.PI / 2, 0, 0],
  })
  return [body, mouth, pin]
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

export function createRj11ConnectorCadModel(): JscadOperation[] {
  const body = createColoredRoundedCuboid({
    center: [0, 0, 6.3],
    color: connectorModelColors.darkPlastic,
    roundRadius: 0.5,
    size: [12.4, 18.2, 12.6],
  })
  const opening = createColoredCuboid({
    center: [0, -8.95, 6.5],
    color: connectorModelColors.blackPlastic,
    size: [9.2, 0.4, 8.1],
  })
  const contacts = Array.from({ length: 6 }, (_, contactIndex) =>
    createColoredCuboid({
      center: [-2.5 + contactIndex, -9.2, 8.5],
      color: connectorModelColors.gold,
      size: [0.34, 0.55, 4.2],
    }),
  )
  return [body, opening, ...contacts]
}
