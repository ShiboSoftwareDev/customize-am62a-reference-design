import type { JscadOperation } from "jscad-planner"
import type { ModelLocalPad } from "./get-model-local-pads"
import { createSmtPadCadContact } from "./create-smt-pad-cad-contact"
import { createHorizontalFpcContact } from "./create-horizontal-fpc-contact"
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
  bodySize?: { width: number; depth: number; height: number }
  modelLocalPads?: ModelLocalPad[]
}): JscadOperation[] {
  const { width, depth, height } = params.bodySize ?? {
    width: params.pinCount * params.pitch + 3.2,
    depth: 4.5,
    height: 1.65,
  }
  const contacts = (params.modelLocalPads ?? [])
    .filter(
      (pad) =>
        pad.pinNumber && /^\d+$/u.test(pad.pinNumber) && Number(pad.pinNumber) <= params.pinCount,
    )
    .flatMap((pad) => createHorizontalFpcContact({ pad, pitch: params.pitch, depth }))
  return [
    createColoredCuboid({
      center: [0, 0, 0.31],
      color: connectorModelColors.whitePlastic,
      size: [width, depth, 0.3],
    }),
    createColoredCuboid({
      center: [0, depth / 2 - 0.4, (height + 0.16) / 2],
      color: connectorModelColors.whitePlastic,
      size: [width, 0.8, height - 0.76],
    }),
    ...[-1, 1].map((side) =>
      createColoredCuboid({
        center: [side * (width / 2 - 0.65), -0.4, (height + 0.16) / 2],
        color: connectorModelColors.whitePlastic,
        size: [1.3, depth - 0.8, height - 0.76],
      }),
    ),
    createColoredCuboid({
      center: [0, 0.5, height - 0.15],
      color: connectorModelColors.whitePlastic,
      size: [width, depth - 1, 0.3],
    }),
    createColoredCuboid({
      center: [0, -depth / 2 + 0.5, height - 0.2],
      color: connectorModelColors.blackPlastic,
      size: [width - 2.6, 1, 0.4],
    }),
    ...contacts,
    ...(params.modelLocalPads ?? []).map((pad) =>
      createSmtPadCadContact(pad, connectorModelColors.metal),
    ),
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
