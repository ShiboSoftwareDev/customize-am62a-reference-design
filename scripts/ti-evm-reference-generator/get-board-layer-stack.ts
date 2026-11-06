import type { AnyCircuitElement } from "circuit-json"

const INNER_LAYER_NAMES = [
  "inner1",
  "inner2",
  "inner3",
  "inner4",
  "inner5",
  "inner6",
  "inner7",
  "inner8",
] as const

export type PcbLayerName = "bottom" | (typeof INNER_LAYER_NAMES)[number] | "top"

export function getBoardLayerStack(circuitJson: AnyCircuitElement[]): PcbLayerName[] {
  const board = circuitJson.find((element) => element.type === "pcb_board")
  const layerCount = board && typeof board.num_layers === "number" ? board.num_layers : 2
  const innerLayers = INNER_LAYER_NAMES.slice(0, Math.max(0, layerCount - 2))
  return layerCount === 1 ? ["top"] : ["top", ...innerLayers, "bottom"]
}

export function isPcbLayerName(layerName: unknown): layerName is PcbLayerName {
  return (
    layerName === "bottom" ||
    layerName === "top" ||
    INNER_LAYER_NAMES.some((innerLayerName) => innerLayerName === layerName)
  )
}
