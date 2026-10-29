import type { JscadOperation } from "jscad-planner"
import {
  connectorModelColors,
  createColoredCuboid,
  createColoredCylinder,
  createColoredRoundedCuboid,
} from "./jscad-model-primitives"

export function createSmdPinHeaderCadModel(params: {
  columnCount: number
  pitch: number
  rowCount: number
}): JscadOperation[] {
  const bodyMargin = Math.min(1.6, params.pitch * 0.72)
  const bodyLength = (params.columnCount - 1) * params.pitch + bodyMargin
  const bodyWidth = (params.rowCount - 1) * params.pitch + bodyMargin
  const bodyHeight = 2.25
  const pinHeight = 6.4
  const pinWidth = Math.min(0.5, params.pitch * 0.32)
  const solderTailLength = Math.max(1.35, params.pitch * 0.9)
  const pins = createPinGrid({
    columnCount: params.columnCount,
    pitch: params.pitch,
    pinHeight,
    pinWidth,
    rowCount: params.rowCount,
    solderTailLength,
  })

  return [
    createColoredRoundedCuboid({
      center: [0, 0, bodyHeight / 2],
      color: connectorModelColors.blackPlastic,
      roundRadius: Math.min(0.22, bodyMargin * 0.12),
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

function createPinGrid(params: {
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
    const rowSide = rowIndex < params.rowCount / 2 ? -1 : 1
    const solderTailCenterY = y + (rowSide * params.solderTailLength) / 2

    return [
      createColoredCuboid({
        center: [x, y, params.pinHeight / 2],
        color: connectorModelColors.gold,
        size: [params.pinWidth, params.pinWidth, params.pinHeight],
      }),
      createColoredCuboid({
        center: [x, solderTailCenterY, 0.12],
        color: connectorModelColors.gold,
        size: [params.pinWidth, params.solderTailLength, 0.24],
      }),
    ]
  }).flat()
}
