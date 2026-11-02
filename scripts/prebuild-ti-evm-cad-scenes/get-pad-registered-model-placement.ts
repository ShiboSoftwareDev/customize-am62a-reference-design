import { fp } from "@tscircuit/footprinter"
import { applyToPoint, compose, rotateDEG, scale } from "transformation-matrix"

export type CadRegistrationPad = { type: string; x?: number; y?: number; port_hints?: string[] }
type PinNumber = string
type NumberedPad = { x: number; y: number; pinNumber: PinNumber }

// Reference pads are package-local XY millimeters; imported pads use board XY.
// Bottom-side mounting mirrors local X before rotating around the board normal.
// The returned angle uses the exporter's CAD rotation convention, whose Z angle
// is reversed by the bottom-side Y=180 degree flip.
export function getPadRegisteredModelPlacement({
  layer,
  modelFootprintString,
  modelPinPositions,
  pads,
}: {
  layer: "top" | "bottom"
  modelFootprintString?: string
  modelPinPositions?: NumberedPad[]
  pads: CadRegistrationPad[]
}): { position: { x: number; y: number }; ccwRotationDegrees: number } | undefined {
  const referencePads =
    modelPinPositions ??
    (modelFootprintString ? getNumberedPads(fp.string(modelFootprintString).circuitJson()) : [])
  const nativePads = getNumberedPads(pads)
  const nativePadByPinNumber = new Map<PinNumber, NumberedPad>(
    nativePads.map((pad) => [pad.pinNumber, pad]),
  )
  const matchedReferencePads = referencePads.filter((pad) =>
    nativePadByPinNumber.has(pad.pinNumber),
  )
  if (matchedReferencePads.length !== referencePads.length || referencePads.length < 3)
    return undefined
  const matchedNativePads = matchedReferencePads.map(
    (pad) => nativePadByPinNumber.get(pad.pinNumber)!,
  )
  const nativeCenter = getPadArrayCenter(matchedNativePads)
  const referenceCenter = getPadArrayCenter(matchedReferencePads)
  let bestScore = Infinity
  let ccwRotationDegrees = 0
  for (const candidateDegrees of [0, 90, 180, 270]) {
    const packageToBoardTransform = compose(
      rotateDEG(candidateDegrees),
      scale(layer === "bottom" ? -1 : 1, 1),
    )
    let score = 0
    for (const referencePad of matchedReferencePads) {
      const nativePad = nativePadByPinNumber.get(referencePad.pinNumber)!
      const boardOffset = applyToPoint(packageToBoardTransform, {
        x: referencePad.x - referenceCenter.x,
        y: referencePad.y - referenceCenter.y,
      })
      score +=
        (nativePad.x - nativeCenter.x - boardOffset.x) ** 2 +
        (nativePad.y - nativeCenter.y - boardOffset.y) ** 2
    }
    if (score < bestScore) {
      bestScore = score
      ccwRotationDegrees = candidateDegrees
    }
  }
  const packageToBoardTransform = compose(
    rotateDEG(ccwRotationDegrees),
    scale(layer === "bottom" ? -1 : 1, 1),
  )
  const originOffset = applyToPoint(packageToBoardTransform, referenceCenter)
  return {
    position: { x: nativeCenter.x - originOffset.x, y: nativeCenter.y - originOffset.y },
    ccwRotationDegrees: layer === "bottom" ? (360 - ccwRotationDegrees) % 360 : ccwRotationDegrees,
  }
}

function getNumberedPads(
  pads: Array<{ type: string; x?: number; y?: number; port_hints?: string[] }>,
): NumberedPad[] {
  return pads.flatMap((pad) => {
    const pinNumber = pad.port_hints?.find((hint) => /^\d+$/u.test(hint))
    if (
      (pad.type !== "pcb_smtpad" && pad.type !== "pcb_plated_hole") ||
      pinNumber === undefined ||
      pad.x === undefined ||
      pad.y === undefined
    )
      return []
    return [{ x: pad.x, y: pad.y, pinNumber }]
  })
}

function getPadArrayCenter(pads: NumberedPad[]): { x: number; y: number } {
  const xs = pads.map((pad) => pad.x)
  const ys = pads.map((pad) => pad.y)
  return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }
}
