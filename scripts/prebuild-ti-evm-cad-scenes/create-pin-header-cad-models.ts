import type { JscadOperation } from "jscad-planner"
import {
  colorize,
  connectorModelColors,
  createColoredCuboid,
  createColoredCylinder,
  createColoredRoundedCuboid,
  subtract,
} from "./jscad-model-primitives"

// TSM-105-01-T-TM: Samtec TSM drawing, figure 6. The center row is
// through-hole; the two outer rows have gullwing surface-mount tails.
// https://suddendocs.samtec.com/prints/tsm-1xx-xx-xxx-xx-x-xxx-x-mkt.pdf
export function createMixedMountPinHeaderCadModel(): JscadOperation[] {
  const columnCount = 5
  const rowCount = 3
  const pitch = 2.54
  const bodyLength = columnCount * pitch
  const bodyWidth = rowCount * pitch
  const bodyHeight = 2.54
  const pinHeight = bodyHeight + 5.84
  const pinWidth = 0.64
  const solderTailLength = (11.43 - (rowCount - 1) * pitch) / 2
  const pins = createMixedMountPinGrid({
    columnCount,
    pitch,
    pinHeight,
    pinWidth,
    rowCount,
    solderTailLength,
  })

  return [
    createColoredRoundedCuboid({
      center: [0, 0, bodyHeight / 2],
      color: connectorModelColors.blackPlastic,
      roundRadius: 0.22,
      size: [bodyLength, bodyWidth, bodyHeight],
    }),
    ...pins,
  ]
}

// Local XY in millimeters, with the socket rows centered about Y=0.
const mikroBusColumnCount = 8
const mikroBusPitchMillimeters = 2.54
const mikroBusRowSeparationMillimeters = 22.86

export const mikroBusSmtPinPositions = [-1, 1].flatMap((side) =>
  Array.from({ length: mikroBusColumnCount }, (_, column) => ({
    pinNumber: String(side < 0 ? column + 1 : 16 - column),
    x: (column - (mikroBusColumnCount - 1) / 2) * mikroBusPitchMillimeters,
    y: side * 12.88,
  })),
)

export function createMikroBusSocketCadModel(): JscadOperation[] {
  const bodyLength = (mikroBusColumnCount - 1) * mikroBusPitchMillimeters + 2.5
  const bodyWidth = 2.5
  const bodyHeight = 8.5
  const sockets = mikroBusSmtPinPositions.map(({ x, y: padY }) => {
    const socketY = (Math.sign(padY) * mikroBusRowSeparationMillimeters) / 2
    const bore = createColoredCylinder({
      center: [x, socketY, bodyHeight - 1.5],
      color: connectorModelColors.blackPlastic,
      height: 4,
      radius: 0.52,
    })
    return { x, padY, socketY, bore }
  })
  const bodies = [-1, 1].map((rowSide) => {
    const body = createColoredRoundedCuboid({
      center: [0, (rowSide * mikroBusRowSeparationMillimeters) / 2, bodyHeight / 2],
      color: connectorModelColors.blackPlastic,
      roundRadius: 0.22,
      size: [bodyLength, bodyWidth, bodyHeight],
    })
    const bores = sockets.filter(({ socketY }) => Math.sign(socketY) === rowSide)
    return colorize(
      connectorModelColors.blackPlastic,
      subtract([body, ...bores.map(({ bore }) => bore)]),
    )
  })
  const contacts = sockets.flatMap(({ x, padY, socketY, bore }) => {
    const rim = createColoredCylinder({
      center: [x, socketY, bodyHeight + 0.02],
      color: connectorModelColors.gold,
      height: 0.08,
      radius: 0.62,
    })
    return [
      colorize(connectorModelColors.gold, subtract([rim, bore])),
      createColoredCuboid({
        center: [x, (padY + socketY) / 2, 0.075],
        color: connectorModelColors.gold,
        size: [0.64, Math.abs(padY - socketY) + 1.3, 0.15],
      }),
    ]
  })
  return [...bodies, ...contacts]
}

function createMixedMountPinGrid(params: {
  columnCount: number
  pinHeight: number
  pinWidth: number
  pitch: number
  rowCount: number
  solderTailLength: number
}): JscadOperation[] {
  return Array.from({ length: params.columnCount * params.rowCount }, (_, pinIndex) => {
    const columnIndex = pinIndex % params.columnCount
    const rowIndex = Math.floor(pinIndex / params.columnCount)
    const x = (columnIndex - (params.columnCount - 1) / 2) * params.pitch
    const y = (rowIndex - (params.rowCount - 1) / 2) * params.pitch
    const isThroughHoleRow = rowIndex === 1
    const throughHoleTailLength = isThroughHoleRow ? 3.81 : 0
    const pin = createColoredCuboid({
      center: [x, y, (params.pinHeight - throughHoleTailLength) / 2],
      color: connectorModelColors.silver,
      size: [params.pinWidth, params.pinWidth, params.pinHeight + throughHoleTailLength],
    })
    if (isThroughHoleRow) return [pin]

    const rowSide = rowIndex === 0 ? -1 : 1
    const solderTailCenterY = y + (rowSide * params.solderTailLength) / 2

    return [
      pin,
      createColoredCuboid({
        center: [x, solderTailCenterY, params.pinWidth / 2],
        color: connectorModelColors.silver,
        size: [params.pinWidth, params.solderTailLength, params.pinWidth],
      }),
    ]
  }).flat()
}
