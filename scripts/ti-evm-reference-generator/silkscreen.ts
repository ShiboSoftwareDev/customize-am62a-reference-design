import type { AnyCircuitElement } from "circuit-json"
import type { ReferenceSilkscreen } from "../../lib/evms/reference-evm-types"
import { getTrailingIndex, round } from "./geometry"
import type { ComponentNameByRecordIndex, ComponentRecordIndex } from "./types"

export function createSilkscreen(params: {
  pcbCircuitJson: AnyCircuitElement[]
  boardCenter: { x: number; y: number }
  boardWidth: number
  boardHeight: number
  componentNames: ComponentNameByRecordIndex
  populatedComponentIndexes: Set<ComponentRecordIndex>
}): ReferenceSilkscreen[] {
  return params.pcbCircuitJson
    .flatMap((element) => {
      const ownerComponentName =
        "pcb_component_id" in element && typeof element.pcb_component_id === "string"
          ? getOwnerComponentName({
              pcbComponentId: element.pcb_component_id,
              componentNames: params.componentNames,
              populatedComponentIndexes: params.populatedComponentIndexes,
            })
          : undefined
      if (element.type === "pcb_silkscreen_line") {
        return [
          {
            kind: "line" as const,
            ownerComponentName,
            layer: element.layer === "bottom" ? "bottom" : "top",
            strokeWidth: round(Math.max(0.05, element.stroke_width)),
            route: [
              {
                x: round(element.x1 - params.boardCenter.x),
                y: round(element.y1 - params.boardCenter.y),
              },
              {
                x: round(element.x2 - params.boardCenter.x),
                y: round(element.y2 - params.boardCenter.y),
              },
            ],
          },
        ]
      }
      if (element.type === "pcb_silkscreen_path") {
        return [
          {
            kind: "line" as const,
            ownerComponentName,
            layer: element.layer === "bottom" ? "bottom" : "top",
            strokeWidth: round(Math.max(0.05, element.stroke_width)),
            route: element.route.map(({ x, y }) => ({
              x: round(x - params.boardCenter.x),
              y: round(y - params.boardCenter.y),
            })),
          },
        ]
      }
      if (element.type === "pcb_silkscreen_rect") {
        const halfWidth = element.width / 2
        const halfHeight = element.height / 2
        const x = element.center.x - params.boardCenter.x
        const y = element.center.y - params.boardCenter.y
        return [
          {
            kind: "line" as const,
            ownerComponentName,
            layer: element.layer === "bottom" ? "bottom" : "top",
            strokeWidth: round(Math.max(0.05, element.stroke_width)),
            route: [
              { x: round(x - halfWidth), y: round(y - halfHeight) },
              { x: round(x + halfWidth), y: round(y - halfHeight) },
              { x: round(x + halfWidth), y: round(y + halfHeight) },
              { x: round(x - halfWidth), y: round(y + halfHeight) },
              { x: round(x - halfWidth), y: round(y - halfHeight) },
            ],
          },
        ]
      }
      if (
        element.type === "pcb_silkscreen_text" &&
        element.text.trim() &&
        !isUnresolvedAltiumText(element.text)
      ) {
        return [
          {
            kind: "text" as const,
            ownerComponentName,
            layer: element.layer === "bottom" ? "bottom" : "top",
            text: element.text,
            x: round(element.anchor_position.x - params.boardCenter.x),
            y: round(element.anchor_position.y - params.boardCenter.y),
            fontSize: round(Math.max(0.6, element.font_size)),
            rotation: round(element.ccw_rotation),
          },
        ]
      }
      if (element.type === "pcb_silkscreen_graphic" && element.shape === "brep") {
        return [
          {
            kind: "line" as const,
            ownerComponentName,
            layer: element.layer === "bottom" ? "bottom" : "top",
            strokeWidth: 0.08,
            route: element.brep_shape.outer_ring.vertices.map(({ x, y }) => ({
              x: round(x - params.boardCenter.x),
              y: round(y - params.boardCenter.y),
            })),
          },
        ]
      }
      return []
    })
    .filter((silkscreen) =>
      isSilkscreenOnBoard({
        silkscreen,
        boardWidth: params.boardWidth,
        boardHeight: params.boardHeight,
      }),
    )
}

function isUnresolvedAltiumText(text: string): boolean {
  return /(?:\.PRJ_|Layer_Name)/iu.test(text)
}

function isSilkscreenOnBoard(params: {
  silkscreen: ReferenceSilkscreen
  boardWidth: number
  boardHeight: number
}): boolean {
  if (params.silkscreen.kind === "text") {
    return isPointOnBoard({
      point: params.silkscreen,
      boardWidth: params.boardWidth,
      boardHeight: params.boardHeight,
    })
  }
  return params.silkscreen.route.every((point) =>
    isPointOnBoard({
      point,
      boardWidth: params.boardWidth,
      boardHeight: params.boardHeight,
    }),
  )
}

function isPointOnBoard(params: {
  point: { x: number; y: number }
  boardWidth: number
  boardHeight: number
}): boolean {
  const margin = 0.5
  return (
    Math.abs(params.point.x) <= params.boardWidth / 2 + margin &&
    Math.abs(params.point.y) <= params.boardHeight / 2 + margin
  )
}

function getOwnerComponentName(params: {
  pcbComponentId: string
  componentNames: ComponentNameByRecordIndex
  populatedComponentIndexes: Set<ComponentRecordIndex>
}): string | undefined {
  const componentIndex = getTrailingIndex(params.pcbComponentId)
  if (!params.populatedComponentIndexes.has(componentIndex)) return undefined
  return params.componentNames.get(componentIndex)
}
