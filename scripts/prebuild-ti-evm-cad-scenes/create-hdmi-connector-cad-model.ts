import type { JscadOperation } from "jscad-planner"
import { connectorModelColors, createColoredCuboid } from "./jscad-model-primitives"

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
  const shell = [
    createColoredCuboid({
      center: [0, params.depth / 2, params.height - shellWallThickness / 2],
      color: connectorModelColors.metal,
      size: [params.upperWidth, params.depth, shellWallThickness],
    }),
    ...([-1, 1] as const).map((side) =>
      createColoredCuboid({
        center: [
          (side * (params.upperWidth - shellWallThickness)) / 2,
          params.depth / 2,
          params.height / 2,
        ],
        color: connectorModelColors.metal,
        size: [shellWallThickness, params.depth, params.height],
      }),
    ),
    createColoredCuboid({
      center: [0, params.depth - shellWallThickness / 2, params.height / 2],
      color: connectorModelColors.metal,
      size: [params.upperWidth, shellWallThickness, params.height],
    }),
    createColoredCuboid({
      center: [0, params.depth / 2, shellWallThickness / 2],
      color: connectorModelColors.metal,
      size: [params.lowerWidth, params.depth, shellWallThickness],
    }),
  ]
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
  return [...shell, tongue, ...contacts]
}
