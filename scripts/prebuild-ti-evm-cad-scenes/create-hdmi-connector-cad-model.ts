import type { JscadOperation, Vector2D } from "jscad-planner"
import {
  colorize,
  connectorModelColors,
  createColoredCuboid,
  createColoredRoundedCuboid,
  subtract,
  translate,
} from "./jscad-model-primitives"

// JAE drawing SJ120821. The mating face is at Y=0, with +Y toward
// the solder tails and Z=0 at the seated PCB surface.
const jaeHdmiShellDepthMillimeters = 10.25
const jaeHdmiSignalRowYMillimeters = 10.2

export const jaeHdmiSignalPinPositions = Array.from({ length: 19 }, (_, index) => ({
  pinNumber: String(index + 1),
  x: 4.25 - index * 0.5,
  y: jaeHdmiSignalRowYMillimeters,
}))

export function createJaeHdmiConnectorCadModel(): JscadOperation[] {
  const depth = jaeHdmiShellDepthMillimeters
  const shell = colorize(
    connectorModelColors.metal,
    subtract([
      createColoredCuboid({
        center: [0, depth / 2, 3.05],
        color: connectorModelColors.metal,
        size: [15, depth, 6.1],
      }),
      extrudeProfileAlongDepth({
        depth: depth - 0.7,
        profile: [
          [-5.15, 0.95],
          [5.15, 0.95],
          [7, 2.65],
          [7, 5.5],
          [-7, 5.5],
          [-7, 2.65],
        ],
      }),
      // The rear underside is open where the insulated signal tails exit.
      translate([0, jaeHdmiSignalRowYMillimeters, 0.2], {
        type: "cuboid",
        size: [10, 1.2, 0.6],
      }),
    ]),
  )
  const tongue = createColoredCuboid({
    center: [0, 4.9, 3.3],
    color: connectorModelColors.blackPlastic,
    size: [10.9, 8.4, 0.85],
  })
  const matingContacts = jaeHdmiSignalPinPositions.map(({ x }, index) =>
    createColoredCuboid({
      center: [x, 3.2, index % 2 === 0 ? 3.75 : 2.85],
      color: connectorModelColors.gold,
      size: [0.2, 3.3, 0.06],
    }),
  )
  const solderTails = jaeHdmiSignalPinPositions.map(({ x, y }) =>
    createColoredCuboid({
      center: [x, y, 0.1],
      color: connectorModelColors.metal,
      size: [0.2, 0.9, 0.2],
    }),
  )
  const shieldTabs = [-1, 1].flatMap((side) => [
    // Front tabs stand just outside the 15 mm shell, with an inward shoulder.
    createColoredRoundedCuboid({
      center: [side * 7.85, 3.6, -0.45],
      color: connectorModelColors.metal,
      roundRadius: 0.1,
      size: [0.5, 1, 2.9],
    }),
    createColoredCuboid({
      center: [side * 7.6, 3.6, 0.9],
      color: connectorModelColors.metal,
      size: [1, 1, 0.3],
    }),
    createColoredRoundedCuboid({
      center: [side * 7.25, 9.5, -0.45],
      color: connectorModelColors.metal,
      roundRadius: 0.1,
      size: [0.5, 1, 2.9],
    }),
  ])
  return [shell, tongue, ...matingContacts, ...solderTails, ...shieldTabs]
}

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
