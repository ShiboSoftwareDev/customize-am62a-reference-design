import type { JscadOperation, Vector2D } from "jscad-planner"
import {
  colorize,
  connectorModelColors,
  createColoredCuboid,
  subtract,
  translate,
} from "./jscad-model-primitives"

export function createHdmiAConnectorCadModel(): JscadOperation[] {
  return createHdmiConnectorCadModel({
    contactCount: 19,
    depth: 11.2,
    height: 6.2,
    lowerWidth: 12.2,
    upperWidth: 14.2,
  })
}

export function createMicroHdmiConnectorCadModel(): JscadOperation[] {
  return createHdmiConnectorCadModel({
    contactCount: 19,
    depth: 7.4,
    height: 3.2,
    lowerWidth: 5.9,
    upperWidth: 6.5,
  })
}

function createHdmiConnectorCadModel(params: {
  contactCount: number
  depth: number
  height: number
  lowerWidth: number
  upperWidth: number
}): JscadOperation[] {
  const outerProfile: Vector2D[] = [
    [-params.lowerWidth / 2, 0],
    [-params.upperWidth / 2, params.height * 0.32],
    [-params.upperWidth / 2, params.height],
    [params.upperWidth / 2, params.height],
    [params.upperWidth / 2, params.height * 0.32],
    [params.lowerWidth / 2, 0],
  ]
  const innerProfile = outerProfile.map(
    ([x, z]) => [x * 0.86, z * 0.72 + params.height * 0.14] as Vector2D,
  )
  const extrudeProfile = (points: Vector2D[]): JscadOperation => ({
    type: "rotateX",
    angle: Math.PI / 2,
    shape: {
      type: "extrudeLinear",
      options: { height: params.depth },
      shape: { type: "fromPointsGeom2", points },
    },
  })
  const shell = colorize(
    connectorModelColors.metal,
    translate(
      [0, params.depth / 2, 0],
      subtract([extrudeProfile(outerProfile), extrudeProfile(innerProfile)]),
    ),
  )
  const tongueHeight = params.height * 0.16
  const tongueCenterZ = params.height * 0.39
  const tongue = createColoredCuboid({
    center: [0, params.depth * 0.44, tongueCenterZ],
    color: connectorModelColors.blackPlastic,
    size: [params.lowerWidth * 0.82, params.depth * 0.72, tongueHeight],
  })
  const contactSpacing = (params.lowerWidth * 0.72) / params.contactCount
  const contacts = Array.from({ length: params.contactCount }, (_, contactIndex) =>
    createColoredCuboid({
      center: [
        (contactIndex - (params.contactCount - 1) / 2) * contactSpacing,
        params.depth * 0.22,
        tongueCenterZ + tongueHeight / 2 + 0.025,
      ],
      color: connectorModelColors.gold,
      size: [contactSpacing * 0.45, params.depth * 0.38, 0.05],
    }),
  )
  return [shell, tongue, ...contacts]
}
