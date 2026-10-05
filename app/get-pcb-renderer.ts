import type { AnyCircuitElement } from "circuit-json"

export type PcbRenderer = "webgpu" | "canvas"

export function getPcbRenderer(circuitJson: AnyCircuitElement[]): PcbRenderer {
  for (const element of circuitJson) {
    if (element.type !== "pcb_trace") continue
    if (element.route_thickness_mode === "interpolated") return "canvas"
    const route = element.route as Array<{ route_type?: string }>
    if (route.some(({ route_type }) => route_type === "through_pad")) return "canvas"
  }

  return "webgpu"
}
