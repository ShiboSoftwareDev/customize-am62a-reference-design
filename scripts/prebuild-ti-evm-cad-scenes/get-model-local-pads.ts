import { applyToPoint, compose, rotateDEG, scale } from "transformation-matrix"
import type { CadRegistrationPad } from "./get-pad-registered-model-placement"

export type ModelLocalPad = {
  x: number
  y: number
  width: number
  height: number
  ccwRotationDegrees: number
}

// Imported pads use board XY millimeters. Replacement models use package XY,
// mirrored across X on the bottom side, then rotated by the PCB component yaw.
export function getModelLocalPads({
  pads,
  position,
  layer,
  ccwRotationDegrees,
}: {
  pads: CadRegistrationPad[]
  position: { x: number; y: number }
  layer: "top" | "bottom"
  ccwRotationDegrees: number
}): ModelLocalPad[] {
  const boardToModelTransform = compose(
    scale(layer === "bottom" ? -1 : 1, 1),
    rotateDEG(-ccwRotationDegrees),
  )
  return pads.flatMap((pad) => {
    const width = pad.width ?? (pad.radius ?? 0) * 2
    const height = pad.height ?? width
    // Microscopic pads are converter connection anchors, not physical lands.
    if (
      pad.type !== "pcb_smtpad" ||
      pad.x === undefined ||
      pad.y === undefined ||
      Math.max(width, height) < 0.06
    )
      return []
    return [
      {
        ...applyToPoint(boardToModelTransform, { x: pad.x - position.x, y: pad.y - position.y }),
        width,
        height,
        ccwRotationDegrees:
          (layer === "bottom" ? -1 : 1) * ((pad.ccw_rotation ?? 0) - ccwRotationDegrees),
      },
    ]
  })
}
