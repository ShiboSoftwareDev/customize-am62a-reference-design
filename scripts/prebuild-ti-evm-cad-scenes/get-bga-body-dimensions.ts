import type { ModelLocalPad } from "./get-model-local-pads"

// Footprint names give package length and width, not necessarily model-local XY.
// Choose the orientation that encloses the imported ball grid in that frame.
export function getBgaBodyDimensions({
  bodyLength,
  bodyWidth,
  modelLocalPads,
}: {
  bodyLength: number
  bodyWidth: number
  modelLocalPads: ModelLocalPad[]
}): { bodyLength: number; bodyWidth: number } {
  const padSpanX = 2 * Math.max(0, ...modelLocalPads.map((pad) => Math.abs(pad.x)))
  const padSpanY = 2 * Math.max(0, ...modelLocalPads.map((pad) => Math.abs(pad.y)))
  if (padSpanX <= bodyWidth && padSpanY <= bodyLength) return { bodyLength, bodyWidth }
  if (padSpanX <= bodyLength && padSpanY <= bodyWidth)
    return { bodyLength: bodyWidth, bodyWidth: bodyLength }
  return { bodyLength, bodyWidth }
}
