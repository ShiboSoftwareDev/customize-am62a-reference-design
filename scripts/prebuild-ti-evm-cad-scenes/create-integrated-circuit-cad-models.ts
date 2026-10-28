import type { Color, JscadOperation } from "jscad-planner"
import {
  connectorModelColors,
  createColoredCuboid,
  createColoredCylinder,
  createColoredPrism,
  createColoredRoundedCuboid,
} from "./jscad-model-primitives"

const integratedCircuitColors = {
  body: [0.025, 0.028, 0.032] as Color,
  marking: [0.48, 0.5, 0.53] as Color,
}

export function createQfpCadModel(params: {
  bodyLength: number
  bodyWidth: number
  pinCount: number
}): JscadOperation[] {
  const pinsPerSide = Math.floor(params.pinCount / 4)
  const bodyHeight = 1.45
  const leadLength = 0.9
  const leadWidth = Math.min(
    0.28,
    (Math.min(params.bodyLength, params.bodyWidth) * 0.7) / pinsPerSide,
  )
  const leads: JscadOperation[] = []

  for (let pinIndex = 0; pinIndex < pinsPerSide; pinIndex += 1) {
    const horizontalOffset = getEvenlySpacedOffset({
      index: pinIndex,
      itemCount: pinsPerSide,
      span: params.bodyWidth * 0.78,
    })
    const verticalOffset = getEvenlySpacedOffset({
      index: pinIndex,
      itemCount: pinsPerSide,
      span: params.bodyLength * 0.78,
    })
    leads.push(
      createColoredCuboid({
        center: [horizontalOffset, -(params.bodyLength + leadLength) / 2, 0.12],
        color: connectorModelColors.metal,
        size: [leadWidth, leadLength, 0.24],
      }),
      createColoredCuboid({
        center: [horizontalOffset, (params.bodyLength + leadLength) / 2, 0.12],
        color: connectorModelColors.metal,
        size: [leadWidth, leadLength, 0.24],
      }),
      createColoredCuboid({
        center: [-(params.bodyWidth + leadLength) / 2, verticalOffset, 0.12],
        color: connectorModelColors.metal,
        size: [leadLength, leadWidth, 0.24],
      }),
      createColoredCuboid({
        center: [(params.bodyWidth + leadLength) / 2, verticalOffset, 0.12],
        color: connectorModelColors.metal,
        size: [leadLength, leadWidth, 0.24],
      }),
    )
  }

  const body = createColoredRoundedCuboid({
    center: [0, 0, bodyHeight / 2],
    color: integratedCircuitColors.body,
    roundRadius: Math.min(0.45, Math.min(params.bodyWidth, params.bodyLength) * 0.04),
    size: [params.bodyWidth, params.bodyLength, bodyHeight],
  })
  const pinOneMark = createColoredCylinder({
    center: [-params.bodyWidth * 0.36, -params.bodyLength * 0.36, bodyHeight + 0.02],
    color: integratedCircuitColors.marking,
    height: 0.04,
    radius: Math.min(0.38, Math.min(params.bodyWidth, params.bodyLength) * 0.035),
  })
  return [body, pinOneMark, ...leads]
}

export function createBgaCadModel(params: {
  ballColumnCount?: number
  ballRowCount?: number
  bodyLength: number
  bodyWidth: number
  pinCount: number
}): JscadOperation[] {
  const bodyHeight = 1.2
  const rowCount =
    params.ballRowCount ??
    Math.max(2, Math.round(Math.sqrt((params.pinCount * params.bodyLength) / params.bodyWidth)))
  const columnCount = params.ballColumnCount ?? Math.ceil(params.pinCount / rowCount)
  const ballRadius = Math.min(
    0.28,
    params.bodyWidth / (columnCount + 2) / 2,
    params.bodyLength / (rowCount + 2) / 2,
  )
  const balls = Array.from({ length: params.pinCount }, (_, ballIndex) => {
    const columnIndex = ballIndex % columnCount
    const rowIndex = Math.floor(ballIndex / columnCount)
    return createColoredPrism({
      center: [
        getEvenlySpacedOffset({
          index: columnIndex,
          itemCount: columnCount,
          span: params.bodyWidth * 0.82,
        }),
        getEvenlySpacedOffset({
          index: rowIndex,
          itemCount: rowCount,
          span: params.bodyLength * 0.82,
        }),
        ballRadius,
      ],
      color: connectorModelColors.gold,
      height: ballRadius * 2,
      radius: ballRadius,
      sideCount: 8,
    })
  })
  const body = createColoredRoundedCuboid({
    center: [0, 0, ballRadius * 2 + bodyHeight / 2],
    color: integratedCircuitColors.body,
    roundRadius: Math.min(0.38, Math.min(params.bodyWidth, params.bodyLength) * 0.035),
    size: [params.bodyWidth, params.bodyLength, bodyHeight],
  })
  const pinOneMark = createColoredCylinder({
    center: [
      -params.bodyWidth * 0.38,
      -params.bodyLength * 0.38,
      ballRadius * 2 + bodyHeight + 0.02,
    ],
    color: integratedCircuitColors.marking,
    height: 0.04,
    radius: Math.min(0.35, Math.min(params.bodyWidth, params.bodyLength) * 0.035),
  })
  return [body, pinOneMark, ...balls]
}

function getEvenlySpacedOffset(params: { index: number; itemCount: number; span: number }): number {
  if (params.itemCount <= 1) return 0
  return -params.span / 2 + (params.index * params.span) / (params.itemCount - 1)
}
