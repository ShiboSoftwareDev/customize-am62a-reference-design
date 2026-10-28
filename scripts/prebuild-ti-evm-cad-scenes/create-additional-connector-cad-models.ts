import type { JscadOperation } from "jscad-planner"
import {
  connectorModelColors,
  createColoredCuboid,
  createColoredRoundedCuboid,
} from "./jscad-model-primitives"

export function createRj45ConnectorCadModel(params: {
  depth: number
  height: number
  width: number
}): JscadOperation[] {
  const contactCount = 8
  const contacts = Array.from({ length: contactCount }, (_, contactIndex) =>
    createColoredCuboid({
      center: [-3.5 + contactIndex, -params.depth / 2 - 0.17, params.height * 0.56],
      color: connectorModelColors.gold,
      size: [0.38, 0.34, params.height * 0.38],
    }),
  )
  const statusLeds = [-1, 1].map((side) =>
    createColoredCuboid({
      center: [side * params.width * 0.34, -params.depth / 2 - 0.19, params.height * 0.8],
      color: side < 0 ? connectorModelColors.greenLed : connectorModelColors.amberLed,
      size: [2, 0.38, 1.4],
    }),
  )
  return [
    createColoredRoundedCuboid({
      center: [0, 0, params.height / 2],
      color: connectorModelColors.metal,
      roundRadius: 0.45,
      size: [params.width, params.depth, params.height],
    }),
    createColoredCuboid({
      center: [0, -params.depth / 2 - 0.16, params.height * 0.48],
      color: connectorModelColors.blackPlastic,
      size: [params.width * 0.76, 0.34, params.height * 0.62],
    }),
    createColoredCuboid({
      center: [0, -params.depth / 2 - 0.36, params.height * 0.19],
      color: connectorModelColors.darkPlastic,
      size: [params.width * 0.46, 0.38, params.height * 0.1],
    }),
    ...contacts,
    ...statusLeds,
  ]
}

export function createFpcConnectorCadModel(params: {
  pinCount: number
  pitch: number
}): JscadOperation[] {
  const width = params.pinCount * params.pitch + 3.2
  const contacts = Array.from({ length: params.pinCount }, (_, pinIndex) =>
    createColoredCuboid({
      center: [(-(params.pinCount - 1) * params.pitch) / 2 + pinIndex * params.pitch, -1.65, 0.62],
      color: connectorModelColors.gold,
      size: [Math.min(params.pitch * 0.48, 0.28), 1.2, 0.12],
    }),
  )
  return [
    createColoredRoundedCuboid({
      center: [0, 0, 0.72],
      color: connectorModelColors.whitePlastic,
      roundRadius: 0.24,
      size: [width, 4.5, 1.45],
    }),
    createColoredCuboid({
      center: [0, 1.45, 1.42],
      color: connectorModelColors.darkPlastic,
      size: [width * 0.9, 1.1, 0.46],
    }),
    createColoredCuboid({
      center: [0, -2.18, 0.92],
      color: connectorModelColors.blackPlastic,
      size: [width * 0.82, 0.22, 0.68],
    }),
    ...contacts,
  ]
}

export function createBoxHeaderCadModel(params: {
  columnCount: number
  pitch: number
  rowCount: number
}): JscadOperation[] {
  const width = (params.columnCount + 1.2) * params.pitch
  const depth = (params.rowCount + 1.2) * params.pitch
  const pins = Array.from({ length: params.columnCount * params.rowCount }, (_, pinIndex) => {
    const columnIndex = pinIndex % params.columnCount
    const rowIndex = Math.floor(pinIndex / params.columnCount)
    return createColoredCuboid({
      center: [
        (-(params.columnCount - 1) * params.pitch) / 2 + columnIndex * params.pitch,
        (-(params.rowCount - 1) * params.pitch) / 2 + rowIndex * params.pitch,
        3.4,
      ],
      color: connectorModelColors.gold,
      size: [0.55, 0.55, 6.8],
    })
  })
  return [
    createColoredRoundedCuboid({
      center: [0, 0, 3.5],
      color: connectorModelColors.blackPlastic,
      roundRadius: 0.35,
      size: [width, depth, 7],
    }),
    createColoredCuboid({
      center: [0, 0, 5.8],
      color: connectorModelColors.darkPlastic,
      size: [width * 0.8, depth * 0.68, 2.5],
    }),
    ...pins,
  ]
}

export function createJstConnectorCadModel(params: {
  pinCount: number
  pitch: number
}): JscadOperation[] {
  const width = (params.pinCount + 1.2) * params.pitch
  const contacts = Array.from({ length: params.pinCount }, (_, pinIndex) =>
    createColoredCuboid({
      center: [(-(params.pinCount - 1) * params.pitch) / 2 + pinIndex * params.pitch, 0.4, 1.4],
      color: connectorModelColors.gold,
      size: [0.42, 2.6, 0.42],
    }),
  )
  return [
    createColoredRoundedCuboid({
      center: [0, 0, 2.2],
      color: connectorModelColors.whitePlastic,
      roundRadius: 0.3,
      size: [width, 5.2, 4.4],
    }),
    createColoredCuboid({
      center: [0, -2.5, 2.4],
      color: connectorModelColors.darkPlastic,
      size: [width * 0.76, 0.25, 1.8],
    }),
    ...contacts,
  ]
}

export function createM2SocketCadModel(): JscadOperation[] {
  const contactCount = 67
  const contacts = Array.from({ length: contactCount }, (_, contactIndex) =>
    createColoredCuboid({
      center: [-10.05 + contactIndex * 0.305, -1.5, 1.9],
      color: connectorModelColors.gold,
      size: [0.14, 1.05, 0.12],
    }),
  )
  return [
    createColoredRoundedCuboid({
      center: [0, 0, 1.65],
      color: connectorModelColors.blackPlastic,
      roundRadius: 0.35,
      size: [22, 4.2, 3.3],
    }),
    createColoredCuboid({
      center: [0, -1.98, 1.78],
      color: connectorModelColors.darkPlastic,
      size: [20.3, 0.28, 1.15],
    }),
    ...contacts,
  ]
}
