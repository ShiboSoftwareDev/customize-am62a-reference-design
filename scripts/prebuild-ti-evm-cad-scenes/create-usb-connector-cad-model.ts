import type { JscadOperation } from "jscad-planner"
import {
  colorize,
  connectorModelColors,
  createColoredCuboid,
  createColoredRoundedCuboid,
  subtract,
  translate,
} from "./jscad-model-primitives"

type UsbConnectorDimensions = {
  contactCount: number
  depth: number
  height: number
  openingHeight: number
  openingWidth: number
  tongueHeight: number
  width: number
}

export function createUsbAConnectorCadModel(): JscadOperation[] {
  return createUsbConnectorCadModel({
    contactCount: 4,
    depth: 15.8,
    height: 7.1,
    openingHeight: 5.4,
    openingWidth: 12.4,
    tongueHeight: 1.2,
    width: 14.2,
  })
}

export function createMicroUsbConnectorCadModel(): JscadOperation[] {
  return createTaperedUsbConnectorCadModel({
    contactCount: 5,
    depth: 5.8,
    height: 2.86,
    openingHeight: 1.8,
    openingWidth: 6.2,
    tongueHeight: 0.45,
    width: 7.5,
  })
}

function createTaperedUsbConnectorCadModel(dimensions: UsbConnectorDimensions): JscadOperation[] {
  const shellWall = 0.3
  const lowerWidth = dimensions.width * 0.84
  const outerProfile = createTrapezoidProfile({
    height: dimensions.height,
    lowerWidth,
    upperWidth: dimensions.width,
  })
  const innerProfile = createTrapezoidProfile({
    height: dimensions.openingHeight,
    lowerWidth: dimensions.openingWidth * 0.82,
    upperWidth: dimensions.openingWidth,
    verticalOffset: (dimensions.height - dimensions.openingHeight) / 2,
  })
  const shell = colorize(
    connectorModelColors.metal,
    subtract([
      extrudeProfileAlongDepth({ depth: dimensions.depth, profile: outerProfile }),
      extrudeProfileAlongDepth({
        depth: dimensions.depth - shellWall,
        profile: innerProfile,
      }),
    ]),
  )
  const tongueCenterZ = dimensions.height / 2 - dimensions.openingHeight * 0.18
  const tongue = createColoredRoundedCuboid({
    center: [0, dimensions.depth * 0.42, tongueCenterZ],
    color: connectorModelColors.blackPlastic,
    roundRadius: 0.12,
    size: [dimensions.openingWidth * 0.74, dimensions.depth * 0.68, dimensions.tongueHeight],
  })
  const contactSpacing = (dimensions.openingWidth * 0.58) / dimensions.contactCount
  const contacts = Array.from({ length: dimensions.contactCount }, (_, contactIndex) =>
    createColoredCuboid({
      center: [
        (contactIndex - (dimensions.contactCount - 1) / 2) * contactSpacing,
        dimensions.depth * 0.26,
        tongueCenterZ + dimensions.tongueHeight / 2 + 0.03,
      ],
      color: connectorModelColors.gold,
      size: [contactSpacing * 0.42, dimensions.depth * 0.42, 0.06],
    }),
  )
  const rearHousing = createColoredCuboid({
    center: [0, dimensions.depth - shellWall * 1.5, dimensions.height / 2],
    color: connectorModelColors.darkPlastic,
    size: [dimensions.openingWidth * 0.88, shellWall, dimensions.openingHeight * 0.86],
  })
  const mountingTabs = [-1, 1].map((side) =>
    createColoredCuboid({
      center: [side * (dimensions.width / 2 + 0.2), dimensions.depth * 0.42, 0.2],
      color: connectorModelColors.metal,
      size: [0.4, dimensions.depth * 0.35, 0.4],
    }),
  )
  return [shell, rearHousing, tongue, ...contacts, ...mountingTabs]
}

function createTrapezoidProfile(params: {
  height: number
  lowerWidth: number
  upperWidth: number
  verticalOffset?: number
}): [number, number][] {
  const verticalOffset = params.verticalOffset ?? 0
  return [
    [-params.lowerWidth / 2, verticalOffset],
    [params.lowerWidth / 2, verticalOffset],
    [params.upperWidth / 2, verticalOffset + params.height],
    [-params.upperWidth / 2, verticalOffset + params.height],
  ]
}

function extrudeProfileAlongDepth(params: {
  depth: number
  profile: [number, number][]
}): JscadOperation {
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

export function createMiniUsbConnectorCadModel(): JscadOperation[] {
  return createUsbConnectorCadModel({
    contactCount: 5,
    depth: 9.2,
    height: 4,
    openingHeight: 2.6,
    openingWidth: 6.8,
    tongueHeight: 0.65,
    width: 8.2,
  })
}

export function createUsbCConnectorCadModel(): JscadOperation[] {
  return createUsbConnectorCadModel({
    contactCount: 16,
    depth: 8.8,
    height: 3.2,
    openingHeight: 2.1,
    openingWidth: 8.4,
    tongueHeight: 0.5,
    width: 9.2,
  })
}

function createUsbConnectorCadModel(dimensions: UsbConnectorDimensions): JscadOperation[] {
  const shellWall = Math.min(0.35, dimensions.height * 0.12)
  const shellCenterY = 0
  const shellCenterZ = dimensions.height / 2
  const outerShell: JscadOperation = {
    type: "roundedCuboid",
    roundRadius: Math.min(0.55, dimensions.height * 0.18),
    segments: 24,
    size: [dimensions.width, dimensions.depth, dimensions.height],
  }
  // Both operands are centered on the shell's local origin. Move the finished
  // shell onto the PCB only after subtraction, keeping the roof intact.
  const opening = translate([0, -dimensions.depth * 0.2, 0], {
    type: "roundedCuboid",
    roundRadius: Math.min(0.35, dimensions.openingHeight * 0.2),
    segments: 20,
    size: [dimensions.openingWidth, dimensions.depth * 0.72, dimensions.openingHeight],
  })
  const shell = colorize(
    connectorModelColors.metal,
    translate([0, shellCenterY, shellCenterZ], subtract([outerShell, opening])),
  )
  const tongueCenterZ =
    dimensions.height / 2 - dimensions.openingHeight / 2 + dimensions.tongueHeight / 2
  const tongue = createColoredRoundedCuboid({
    center: [0, -dimensions.depth * 0.18, tongueCenterZ],
    color: connectorModelColors.blackPlastic,
    roundRadius: Math.min(0.2, dimensions.tongueHeight * 0.25),
    size: [dimensions.openingWidth * 0.82, dimensions.depth * 0.58, dimensions.tongueHeight],
  })
  const contactSpacing = (dimensions.openingWidth * 0.68) / dimensions.contactCount
  const contacts = Array.from({ length: dimensions.contactCount }, (_, contactIndex) =>
    createColoredCuboid({
      center: [
        (contactIndex - (dimensions.contactCount - 1) / 2) * contactSpacing,
        -dimensions.depth * 0.35,
        tongueCenterZ + dimensions.tongueHeight / 2 + 0.03,
      ],
      color: connectorModelColors.gold,
      size: [contactSpacing * 0.38, dimensions.depth * 0.4, 0.06],
    }),
  )
  const rearHousing = createColoredCuboid({
    center: [0, dimensions.depth * 0.42, dimensions.height * 0.48],
    color: connectorModelColors.darkPlastic,
    size: [dimensions.openingWidth * 0.92, dimensions.depth * 0.16, dimensions.height * 0.7],
  })
  const mountingTabs = [-1, 1].map((side) =>
    createColoredCuboid({
      center: [side * (dimensions.width / 2 + shellWall / 2), dimensions.depth * 0.28, 0.25],
      color: connectorModelColors.metal,
      size: [shellWall, dimensions.depth * 0.28, 0.5],
    }),
  )

  return [shell, tongue, rearHousing, ...contacts, ...mountingTabs]
}
