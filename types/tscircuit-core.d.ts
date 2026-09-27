declare module "@tscircuit/core" {
  import type { AnyCircuitElement } from "circuit-json"
  import type { ReactNode } from "react"

  export class Circuit {
    constructor(options?: { platform?: { drcChecksDisabled?: boolean } })
    _featureMspSchematicTraceRouting: boolean
    add(element: ReactNode): void
    renderUntilSettled(): Promise<void>
    getCircuitJson(): AnyCircuitElement[]
  }
}
