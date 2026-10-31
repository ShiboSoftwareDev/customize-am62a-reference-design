import type { JscadOperation } from "jscad-planner"
import {
  connectorModelColors,
  createColoredCuboid,
  createColoredCylinder,
  createColoredRoundedCuboid,
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

export function createMikroBusSocketCadModel(): JscadOperation[] {
  const columnCount = 8
  const pitch = 2.54
  const rowSeparation = 22.86
  const bodyLength = (columnCount - 1) * pitch + 2.5
  const bodyWidth = 2.5
  const bodyHeight = 8.5
  const bodies = [-1, 1].map((rowSide) =>
    createColoredRoundedCuboid({
      center: [0, (rowSide * rowSeparation) / 2, bodyHeight / 2],
      color: connectorModelColors.blackPlastic,
      roundRadius: 0.22,
      size: [bodyLength, bodyWidth, bodyHeight],
    }),
  )
  const contacts = [-1, 1].flatMap((rowSide) =>
    Array.from({ length: columnCount }, (_, columnIndex) => {
      const x = (columnIndex - (columnCount - 1) / 2) * pitch
      const y = (rowSide * rowSeparation) / 2
      return [
        createColoredCylinder({
          center: [x, y, bodyHeight + 0.02],
          color: connectorModelColors.gold,
          height: 0.08,
          radius: 0.62,
        }),
        createColoredCylinder({
          center: [x, y, bodyHeight + 0.07],
          color: connectorModelColors.darkPlastic,
          height: 0.1,
          radius: 0.36,
        }),
        createColoredCuboid({
          center: [x, y, -0.65],
          color: connectorModelColors.gold,
          size: [0.5, 0.5, 1.3],
        }),
      ]
    }),
  )
  return [...bodies, ...contacts.flat()]
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
