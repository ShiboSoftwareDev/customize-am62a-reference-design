import type { AnyCircuitElement } from "circuit-json"

export type BoardRenderResponse = {
  circuitJson: AnyCircuitElement[]
  renderDurationMs: number
  cacheStatus: "hit" | "miss"
}
