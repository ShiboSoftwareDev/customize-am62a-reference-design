import type { Color, JscadOperation } from "jscad-planner"
import type { ModelLocalPad } from "./get-model-local-pads"
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
}): JscadOperation[] {
  const bodyHeight = 1.45
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
  bodyLength: number
  bodyWidth: number
  modelLocalPads: ModelLocalPad[]
}): JscadOperation[] {
  const bodyHeight = 1.2
  const ballRadius = Math.min(
    0.28,
    ...params.modelLocalPads.map((pad) => Math.min(pad.width, pad.height) / 2),
  )
  const balls = params.modelLocalPads.map((pad) =>
    createColoredPrism({
      center: [pad.x, pad.y, ballRadius],
      color: connectorModelColors.gold,
      height: ballRadius * 2,
      radius: ballRadius,
      sideCount: 8,
    }),
  )

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
