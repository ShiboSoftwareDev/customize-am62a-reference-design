import type { AnyCircuitElement } from "circuit-json"
import type { OptionalModuleSelection } from "./module-config"

export type BoardRenderRequest = {
  selection: OptionalModuleSelection
  addPours: boolean
}

export type BoardRenderResponse = {
  circuitJson: AnyCircuitElement[]
  renderDurationMs: number
  cacheStatus: "hit" | "miss"
}
