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
  depth: number
  height: number
  openingHeight: number
  openingWidth: number
  tongueHeight: number
  width: number
} & ({ contactCount: number } | { twoSidedContactOffsetsMillimeters: number[] })

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

export function createUsbCConnectorCadModel(part: "2012670005" | "UBF31-0171"): JscadOperation[] {
  return createUsbConnectorCadModel({
    // The UBF31-0171 combines four pairs of power/ground terminals at
    // the PCB but presents both contacts of each pair at the mating face.
    twoSidedContactOffsetsMillimeters:
      part === "2012670005"
        ? [-2.75, -2.25, -1.75, -1.25, -0.75, -0.25, 0.25, 0.75, 1.25, 1.75, 2.25, 2.75]
        : [-2.75, -1.25, -0.75, -0.25, 0.25, 0.75, 1.25, 2.75],
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
  const openingCenterY = -dimensions.depth * 0.2
  const openingDepth = dimensions.depth * 0.72
  const opening = translate([0, openingCenterY, 0], {
    type: "roundedCuboid",
    roundRadius: Math.min(0.35, dimensions.openingHeight * 0.2),
    segments: 20,
    size: [dimensions.openingWidth, openingDepth, dimensions.openingHeight],
  })
  const shell = colorize(
    connectorModelColors.metal,
    translate([0, shellCenterY, shellCenterZ], subtract([outerShell, opening])),
  )
  const hasTwoContactRows = "twoSidedContactOffsetsMillimeters" in dimensions
  const tongueCenterZ =
    dimensions.height / 2 -
    (hasTwoContactRows ? 0 : (dimensions.openingHeight - dimensions.tongueHeight) / 2)
  const tongueDepth = dimensions.depth * 0.58
  const tongueCenterY = -dimensions.depth * 0.18
  const tongue = createColoredRoundedCuboid({
    center: [0, tongueCenterY, tongueCenterZ],
    color: connectorModelColors.blackPlastic,
    roundRadius: Math.min(0.2, dimensions.tongueHeight * 0.25),
    size: [dimensions.openingWidth * 0.82, tongueDepth, dimensions.tongueHeight],
  })
  const contactSpacing =
    (dimensions.openingWidth * 0.68) /
    (hasTwoContactRows
      ? dimensions.twoSidedContactOffsetsMillimeters.length
      : dimensions.contactCount)
  const contactOffsets = hasTwoContactRows
    ? dimensions.twoSidedContactOffsetsMillimeters
    : Array.from(
        { length: dimensions.contactCount },
        (_, index) => (index - (dimensions.contactCount - 1) / 2) * contactSpacing,
      )
  const contactWidth = hasTwoContactRows ? 0.25 : contactSpacing * 0.38
  const tongueFaces = hasTwoContactRows ? [1, -1] : [1]
  const contacts = tongueFaces.flatMap((side) =>
    contactOffsets.map((offset) =>
      createColoredCuboid({
        center: [
          offset,
          tongueCenterY,
          tongueCenterZ + side * (dimensions.tongueHeight / 2 + 0.03),
        ],
        color: connectorModelColors.gold,
        size: [contactWidth, dimensions.depth * 0.4, 0.06],
      }),
    ),
  )
  // Seat the insulator in the cavity's back wall, away from the exterior metal
  // face. Coplanar plastic and metal faces flicker as the camera moves.
  const rearHousing = createColoredCuboid({
    center: [0, openingCenterY + openingDepth / 2, dimensions.height * 0.48],
    color: connectorModelColors.darkPlastic,
    size: [dimensions.openingWidth * 0.92, shellWall * 2, dimensions.height * 0.7],
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
