import { isPointInsidePolygon } from "@tscircuit/math-utils"
import type { AnyCircuitElement } from "circuit-json"

type Point = { x: number; y: number }
type PouredCopper = AnyCircuitElement & {
  type: "pcb_copper_pour"
  layer: string
  shape: "brep" | "polygon"
  points?: Point[]
  brep_shape?: { outer_ring: { vertices: Point[] }; inner_rings?: Array<{ vertices: Point[] }> }
}

export function copperContainsPoint({
  circuitJson,
  point,
  layer,
}: {
  circuitJson: AnyCircuitElement[]
  point: Point
  layer: string
}): boolean {
  return circuitJson
    .filter(isPouredCopper)
    .some(
      (pour) =>
        pour.layer === layer &&
        isPointInsidePolygon(point, pour.brep_shape?.outer_ring.vertices ?? pour.points ?? []) &&
        !(pour.brep_shape?.inner_rings ?? []).some((ring) =>
          isPointInsidePolygon(point, ring.vertices),
        ),
    )
}

function isPouredCopper(element: AnyCircuitElement): element is PouredCopper {
  return (
    element.type === "pcb_copper_pour" && (element.shape === "brep" || element.shape === "polygon")
  )
}
