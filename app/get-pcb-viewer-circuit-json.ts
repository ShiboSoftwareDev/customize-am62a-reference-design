import { getPcbElementBounds } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement } from "circuit-json"
import { getPcbAnnotationBounds } from "./get-pcb-annotation-bounds"

export function getPcbViewerCircuitJson(circuitJson: AnyCircuitElement[]): AnyCircuitElement[] {
  const board = circuitJson.find((element) => element.type === "pcb_board")
  if (!board) return circuitJson
  const boardBounds = getPcbElementBounds(board)
  if (!boardBounds) return circuitJson

  return circuitJson.filter((element) => {
    if (
      element.type !== "pcb_cutout" &&
      !element.type.startsWith("pcb_silkscreen_") &&
      !element.type.startsWith("pcb_fabrication_note_")
    )
      return true
    const bounds = getPcbAnnotationBounds(element)
    if (!bounds) return true
    const overlapWidth =
      Math.min(bounds.maxX, boardBounds.maxX) - Math.max(bounds.minX, boardBounds.minX)
    const overlapHeight =
      Math.min(bounds.maxY, boardBounds.maxY) - Math.max(bounds.minY, boardBounds.minY)
    if (element.type === "pcb_cutout") return overlapWidth > 0 && overlapHeight > 0
    return overlapWidth >= 0 && overlapHeight >= 0
  })
}
