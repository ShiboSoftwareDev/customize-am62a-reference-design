import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"

type Point = { x: number; y: number }

export function getFocusedPcbSvg(params: {
  circuitJson: AnyCircuitElement[]
  maximumX: number
  maximumY: number
  minimumX: number
  minimumY: number
}): string {
  return convertCircuitJsonToPcbSvg(getPcbRegion(params), {
    includeVersion: false,
    showErrorsInTextOverlay: false,
  })
}

function getPcbRegion(params: {
  circuitJson: AnyCircuitElement[]
  maximumX: number
  maximumY: number
  minimumX: number
  minimumY: number
}): AnyCircuitElement[] {
  const center = {
    x: (params.minimumX + params.maximumX) / 2,
    y: (params.minimumY + params.maximumY) / 2,
  }
  return params.circuitJson.flatMap((element) => {
    if (element.type === "pcb_board") {
      return [
        {
          ...element,
          center,
          height: params.maximumY - params.minimumY,
          outline: [
            { x: params.minimumX, y: params.minimumY },
            { x: params.maximumX, y: params.minimumY },
            { x: params.maximumX, y: params.maximumY },
            { x: params.minimumX, y: params.maximumY },
          ],
          width: params.maximumX - params.minimumX,
        },
      ]
    }
    return element.type.startsWith("pcb_") && isElementInRegion({ element, ...params })
      ? [element]
      : []
  })
}

function isElementInRegion(params: {
  element: AnyCircuitElement
  maximumX: number
  maximumY: number
  minimumX: number
  minimumY: number
}): boolean {
  return getElementPoints(params.element).some(
    ({ x, y }) =>
      x >= params.minimumX && x <= params.maximumX && y >= params.minimumY && y <= params.maximumY,
  )
}

function getElementPoints(element: AnyCircuitElement): Point[] {
  const center = "center" in element && isPoint(element.center) ? [element.center] : []
  const outline =
    "outline" in element && Array.isArray(element.outline) ? element.outline.filter(isPoint) : []
  const route =
    "route" in element && Array.isArray(element.route) ? element.route.filter(isPoint) : []
  const position =
    "x" in element &&
    "y" in element &&
    typeof element.x === "number" &&
    typeof element.y === "number"
      ? [{ x: element.x, y: element.y }]
      : []
  return [...center, ...outline, ...route, ...position]
}

function isPoint(value: unknown): value is Point {
  return (
    typeof value === "object" &&
    value !== null &&
    "x" in value &&
    "y" in value &&
    typeof value.x === "number" &&
    typeof value.y === "number"
  )
}
