declare module "@tscircuit/pcb-viewer" {
  import type { AnyCircuitElement } from "circuit-json"
  import type { ComponentType } from "react"

  export const PCBViewer: ComponentType<{
    circuitJson?: AnyCircuitElement[]
    height?: number
    renderer?: "webgpu" | "canvas"
    allowEditing?: boolean
    focusOnHover?: boolean
  }>
}
