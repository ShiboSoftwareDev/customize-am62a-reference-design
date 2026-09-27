declare module "@tscircuit/core" {
  import type { AnyCircuitElement } from "circuit-json"
  import type { ReactNode } from "react"

  export class Circuit {
    _featureMspSchematicTraceRouting: boolean
    add(element: ReactNode): void
    renderUntilSettled(): Promise<void>
    getCircuitJson(): AnyCircuitElement[]
  }
}
