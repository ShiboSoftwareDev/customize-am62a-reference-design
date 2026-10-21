import type { AnyCircuitElement } from "circuit-json"
import { useEffect } from "react"
import { usePrebuiltPcb } from "app/hooks/use-prebuilt-pcb"
import { usePrebuiltSchematics } from "app/hooks/use-prebuilt-schematics"
import { preloadTiEvmCadScenes, retainTiEvmCircuitJsonCache } from "app/preload-ti-evm"
import type { TiEvm, TiEvmVariant } from "lib/ti-evm-catalog"

type EvmRenderState = {
  pcbCircuitJson: AnyCircuitElement[] | null
  schematicCircuitJsons: AnyCircuitElement[][]
  schematicVariant: TiEvmVariant | null
  error: string
  isLoading: boolean
  elapsedMs: number
}

export function useEvmRender(request: {
  evm: TiEvm
  variant: TiEvmVariant
  loadCadScenes: boolean
  loadSchematics: boolean
  retryIndex: number
}): EvmRenderState {
  useEffect(() => {
    retainTiEvmCircuitJsonCache({ evm: request.evm })
  }, [request.evm])

  useEffect(() => {
    if (!request.loadCadScenes) return
    void preloadTiEvmCadScenes({ evm: request.evm }).catch(() => undefined)
  }, [request.evm, request.loadCadScenes])

  const pcb = usePrebuiltPcb(request)
  const schematics = usePrebuiltSchematics(request)

  return {
    pcbCircuitJson: pcb.circuitJson,
    schematicCircuitJsons: schematics.circuitJsons,
    schematicVariant: schematics.variant,
    error: pcb.error || schematics.error,
    isLoading: pcb.isLoading || schematics.isLoading,
    elapsedMs: pcb.elapsedMs,
  }
}
