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
  const shellWallThickness = Math.max(0.28, params.height * 0.07)
  const outerProfile = createConnectorProfile({
    height: params.height,
    lowerWidth: params.lowerWidth,
    upperWidth: params.upperWidth,
  })
  const innerProfile = createConnectorProfile({
    height: params.height - shellWallThickness * 2,
    lowerWidth: params.lowerWidth - shellWallThickness * 2,
    upperWidth: params.upperWidth - shellWallThickness * 2,
    verticalOffset: shellWallThickness,
  })
  const outerShell = extrudeProfileAlongDepth({ depth: params.depth, profile: outerProfile })
  const innerOpening = extrudeProfileAlongDepth({
    depth: params.depth - shellWallThickness,
    profile: innerProfile,
  })
  const shell = colorize(connectorModelColors.metal, subtract([outerShell, innerOpening]))
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
  const rearInsulator = createColoredCuboid({
    center: [0, params.depth - shellWallThickness * 1.5, params.height / 2],
    color: connectorModelColors.darkPlastic,
    size: [params.lowerWidth * 0.9, shellWallThickness, params.height * 0.7],
  })
  return [shell, rearInsulator, tongue, ...contacts]
}

function createConnectorProfile(params: {
  height: number
  lowerWidth: number
  upperWidth: number
  verticalOffset?: number
}): Vector2D[] {
  const verticalOffset = params.verticalOffset ?? 0
  return [
    [-params.lowerWidth / 2, verticalOffset],
    [params.lowerWidth / 2, verticalOffset],
    [params.upperWidth / 2, verticalOffset + params.height],
    [-params.upperWidth / 2, verticalOffset + params.height],
  ]
}

function extrudeProfileAlongDepth(params: { depth: number; profile: Vector2D[] }): JscadOperation {
  const extrudedProfile: JscadOperation = {
    type: "extrudeLinear",
    options: { height: params.depth },
    shape: { type: "fromPointsGeom2", points: params.profile },
  }
  return translate([0, params.depth, 0], {
    type: "rotateX",
    angle: Math.PI / 2,
    shape: extrudedProfile,
  })
}
