import type { Color, JscadOperation } from "jscad-planner"
import type { ModelLocalPad } from "./get-model-local-pads"
import { getBgaBodyDimensions } from "./get-bga-body-dimensions"
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
  modelLocalPads: ModelLocalPad[]
  packageHeight?: number
}): JscadOperation[] {
  const bodyStandoff = params.packageHeight ? 0.1 : 0
  const markingHeight = params.packageHeight ? 0.02 : 0.04
  const bodyHeight = params.packageHeight
    ? params.packageHeight - bodyStandoff - markingHeight
    : 1.45
  const leads = params.modelLocalPads.flatMap((pad) => {
    const isHorizontalLead =
      Math.abs(pad.x) / params.bodyWidth > Math.abs(pad.y) / params.bodyLength
    const bodyEdge = isHorizontalLead ? params.bodyWidth / 2 : params.bodyLength / 2
    const padOffset = isHorizontalLead ? pad.x : pad.y
    const leadLength = Math.max(0.05, Math.abs(padOffset) - bodyEdge + 0.1)
    const leadCenter = (Math.sign(padOffset) * (Math.abs(padOffset) + bodyEdge)) / 2
    return [
      createPadContact(pad),
      createColoredCuboid({
        center: isHorizontalLead ? [leadCenter, pad.y, 0.2] : [pad.x, leadCenter, 0.2],
        color: connectorModelColors.metal,
        size: isHorizontalLead
          ? [leadLength, getLeadWidth(pad), 0.2]
          : [getLeadWidth(pad), leadLength, 0.2],
      }),
    ]
  })

  const body = createColoredRoundedCuboid({
    center: [0, 0, bodyStandoff + bodyHeight / 2],
    color: integratedCircuitColors.body,
    roundRadius: Math.min(0.45, Math.min(params.bodyWidth, params.bodyLength) * 0.04),
    size: [params.bodyWidth, params.bodyLength, bodyHeight],
  })
  const pinOneMark = createColoredCylinder({
    center: [
      -params.bodyWidth * 0.36,
      -params.bodyLength * 0.36,
      bodyStandoff + bodyHeight + markingHeight / 2,
    ],
    color: integratedCircuitColors.marking,
    height: markingHeight,
    radius: Math.min(0.38, Math.min(params.bodyWidth, params.bodyLength) * 0.035),
  })
  return [body, pinOneMark, ...leads]
}

export function createBgaCadModel(params: {
  bodyLength: number
  bodyWidth: number
  modelLocalPads: ModelLocalPad[]
  packageHeight?: number
}): JscadOperation[] {
  const { bodyLength, bodyWidth } = getBgaBodyDimensions(params)
  const ballRadius = Math.min(
    0.28,
    ...params.modelLocalPads.map((pad) => Math.min(pad.width, pad.height) / 2),
  )
  // The declared package height includes the solder balls and pin-one mark.
  const ballHeight = Math.min(ballRadius * 2, (params.packageHeight ?? Infinity) * 0.35)
  const markingHeight = params.packageHeight ? 0.02 : 0.04
  const bodyHeight = params.packageHeight ? params.packageHeight - ballHeight - markingHeight : 1.2
  const balls = params.modelLocalPads.map((pad) =>
    createColoredPrism({
      center: [pad.x, pad.y, ballHeight / 2],
      color: connectorModelColors.gold,
      height: ballHeight,
      radius: ballRadius,
      sideCount: 8,
    }),
  )

  const body = createColoredRoundedCuboid({
    center: [0, 0, ballHeight + bodyHeight / 2],
    color: integratedCircuitColors.body,
    roundRadius: Math.min(0.38, bodyHeight / 3, Math.min(bodyWidth, bodyLength) * 0.035),
    size: [bodyWidth, bodyLength, bodyHeight],
  })
  const pinOneMark = createColoredCylinder({
    center: [-bodyWidth * 0.38, -bodyLength * 0.38, ballHeight + bodyHeight + markingHeight / 2],
    color: integratedCircuitColors.marking,
    height: markingHeight,
    radius: Math.min(0.35, Math.min(bodyWidth, bodyLength) * 0.035),
  })
  return [body, pinOneMark, ...balls]
}

function getLeadWidth(pad: ModelLocalPad): number {
  return Math.min(pad.width, pad.height) * 0.75
}

function createPadContact(pad: ModelLocalPad): JscadOperation {
  return {
    type: "translate",
    vector: [pad.x, pad.y, 0],
    shape: {
      type: "rotate",
      angles: [0, 0, (pad.ccwRotationDegrees * Math.PI) / 180],
      shape: createColoredCuboid({
        center: [0, 0, 0.1],
        color: connectorModelColors.metal,
        size: [pad.width * 0.75, pad.height * 0.75, 0.2],
      }),
    },
  }
}
