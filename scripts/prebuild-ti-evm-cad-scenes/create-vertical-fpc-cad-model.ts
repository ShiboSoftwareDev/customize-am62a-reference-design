import type { Color, JscadOperation } from "jscad-planner"
import type { ModelLocalPad } from "./get-model-local-pads"
import { createSmtPadCadContact } from "./create-smt-pad-cad-contact"
import { connectorModelColors, createColoredCuboid } from "./jscad-model-primitives"

// Package-local millimeters: the PCB is Z=0 and the cable enters along +Z.
export function createVerticalFpcCadModel({
  width,
  depth,
  height,
  pinCount,
  pitch,
  housingColor,
  modelLocalPads,
}: {
  width: number
  depth: number
  height: number
  pinCount: number
  pitch: number
  housingColor: Color
  modelLocalPads: ModelLocalPad[]
}): JscadOperation[] {
  const baseTop = 0.76
  return [
    createColoredCuboid({
      center: [0, 0, 0.46],
      color: housingColor,
      size: [width, depth, 0.6],
    }),
    createColoredCuboid({
      center: [0, depth / 2 - 0.35, (height + baseTop) / 2],
      color: housingColor,
      size: [width, 0.7, height - baseTop],
    }),
    createColoredCuboid({
      center: [0, -depth / 2 + 0.35, (height - 0.35 + baseTop) / 2],
      color: housingColor,
      size: [width, 0.7, height - 0.35 - baseTop],
    }),
    ...[-1, 1].map((side) =>
      createColoredCuboid({
        center: [side * (width / 2 - 0.6), 0, (height + baseTop) / 2],
        color: housingColor,
        size: [1.2, depth - 1.4, height - baseTop],
      }),
    ),
    createColoredCuboid({
      center: [0, -depth / 2 + 0.35, height - 0.175],
      color: connectorModelColors.blackPlastic,
      size: [width, 0.7, 0.35],
    }),
    ...Array.from({ length: pinCount }, (_, pinIndex) =>
      createColoredCuboid({
        center: [(pinIndex - (pinCount - 1) / 2) * pitch, depth / 2 - 0.8, height * 0.6],
        color: connectorModelColors.gold,
        size: [Math.min(pitch * 0.4, 0.3), 0.2, height * 0.55],
      }),
    ),
    ...modelLocalPads.map((pad) => createSmtPadCadContact(pad, connectorModelColors.metal)),
  ]
}
