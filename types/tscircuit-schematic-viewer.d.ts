declare module "@tscircuit/schematic-viewer" {
  import type { AnyCircuitElement } from "circuit-json"
  import type { ComponentType, CSSProperties } from "react"

  export const SchematicViewer: ComponentType<{
    circuitJson: AnyCircuitElement[]
    containerStyle?: CSSProperties
  }>
}
