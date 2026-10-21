import type { AnyCircuitElement } from "circuit-json"
import { usePrebuiltPcb } from "app/hooks/use-prebuilt-pcb"
import { usePrebuiltSchematics } from "app/hooks/use-prebuilt-schematics"
import type { TiEvm, TiEvmVariant } from "lib/ti-evm-catalog"

type EvmRenderState = {
  pcbCircuitJson: AnyCircuitElement[] | null
  schematicCircuitJsons: AnyCircuitElement[][]
  error: string
  isLoading: boolean
  elapsedMs: number
}

export function useEvmRender(request: {
  evm: TiEvm
  variant: TiEvmVariant
  loadSchematics: boolean
  retryIndex: number
}): EvmRenderState {
  const pcb = usePrebuiltPcb(request)
  const schematics = usePrebuiltSchematics(request)

  return {
    pcbCircuitJson: pcb.circuitJson,
    schematicCircuitJsons: schematics.circuitJsons,
    error: pcb.error || schematics.error,
    isLoading: pcb.isLoading || schematics.isLoading,
    elapsedMs: pcb.elapsedMs,
  }
}
