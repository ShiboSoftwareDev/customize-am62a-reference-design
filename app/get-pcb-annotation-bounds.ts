import { getPcbElementBounds } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement } from "circuit-json"

export function getPcbAnnotationBounds(element: AnyCircuitElement) {
  if (
    (element.type === "pcb_silkscreen_line" || element.type === "pcb_fabrication_note_line") &&
    typeof element.x1 === "number" &&
    typeof element.y1 === "number" &&
    typeof element.x2 === "number" &&
    typeof element.y2 === "number"
  ) {
    return {
      minX: Math.min(element.x1, element.x2),
      minY: Math.min(element.y1, element.y2),
      maxX: Math.max(element.x1, element.x2),
      maxY: Math.max(element.y1, element.y2),
    }
  }
  return getPcbElementBounds(element)
}
