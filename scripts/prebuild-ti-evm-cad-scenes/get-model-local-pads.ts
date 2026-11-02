import { applyToPoint, compose, rotateDEG, scale } from "transformation-matrix"
import type { CadRegistrationPad } from "./get-pad-registered-model-placement"

export type ModelLocalPad = {
  x: number
  y: number
  width: number
  height: number
  ccwRotationDegrees: number
  isConnectionAnchor?: boolean
  pinNumber?: string
}

// Imported pads use board XY millimeters. Replacement models use package XY,
// mirrored across X on the bottom side, then rotated by the PCB component yaw.
export function getModelLocalPads({
  pads,
  includeConnectionAnchors = false,
  position,
  layer,
  ccwRotationDegrees,
}: {
  pads: CadRegistrationPad[]
  includeConnectionAnchors?: boolean
  position: { x: number; y: number }
  layer: "top" | "bottom"
  ccwRotationDegrees: number
}): ModelLocalPad[] {
  const boardToModelTransform = compose(
    scale(layer === "bottom" ? -1 : 1, 1),
    rotateDEG(-ccwRotationDegrees),
  )
  return pads.flatMap((inputPad) => {
    let pad = inputPad
    if (includeConnectionAnchors && pad.points?.length) {
      const xs = pad.points.map((point) => point.x)
      const ys = pad.points.map((point) => point.y)
      pad = {
        ...pad,
        x: (Math.min(...xs) + Math.max(...xs)) / 2,
        y: (Math.min(...ys) + Math.max(...ys)) / 2,
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys),
      }
    }
    const width = pad.width ?? (pad.radius ?? 0) * 2
    const height = pad.height ?? width
    // Microscopic pads are converter connection anchors, not physical lands.
    if (
      pad.type !== "pcb_smtpad" ||
      pad.x === undefined ||
      pad.y === undefined ||
      (Math.max(width, height) < 0.06 && !includeConnectionAnchors)
    )
      return []
    return [
      {
        ...applyToPoint(boardToModelTransform, { x: pad.x - position.x, y: pad.y - position.y }),
        width,
        height,
        ...(Math.max(width, height) < 0.06 ? { isConnectionAnchor: true } : {}),
        ccwRotationDegrees:
          (layer === "bottom" ? -1 : 1) * ((pad.ccw_rotation ?? 0) - ccwRotationDegrees),
        pinNumber: pad.port_hints?.find((hint) => /^\d+[A-Z]?$/u.test(hint)),
      },
    ]
  })
}
