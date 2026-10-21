import type { AnyCircuitElement } from "circuit-json"
import { useEffect, useRef, useState } from "react"
import { loadPrebuiltCircuitJson } from "app/load-prebuilt-circuit-json"
import { getCachedTiEvmVariantSchematics, preloadTiEvmSchematicVariants } from "app/preload-ti-evm"
import {
  getTiEvmVariantSchematicCircuitJsonUrls,
  type TiEvm,
  type TiEvmVariant,
} from "lib/ti-evm-catalog"

type LoadedSchematics = {
  variant: TiEvmVariant
  circuitJsons: AnyCircuitElement[][]
}

export function usePrebuiltSchematics(request: {
  evm: TiEvm
  variant: TiEvmVariant
  loadSchematics: boolean
  retryIndex: number
}): {
  circuitJsons: AnyCircuitElement[][]
  error: string
  isLoading: boolean
} {
  const [loadedSchematics, setLoadedSchematics] = useState<LoadedSchematics | null>(null)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const requestIndexRef = useRef(0)
  const retryIndexRef = useRef(request.retryIndex)

  useEffect(() => {
    if (!request.loadSchematics) {
      requestIndexRef.current++
      retryIndexRef.current = request.retryIndex
      setError("")
      setIsLoading(false)
      return
    }

    const requestIndex = ++requestIndexRef.current
    const forceReload = retryIndexRef.current !== request.retryIndex
    retryIndexRef.current = request.retryIndex
    const cachedCircuitJsons = forceReload
      ? undefined
      : getCachedTiEvmVariantSchematics({ variant: request.variant })
    const circuitJsonUrls = getTiEvmVariantSchematicCircuitJsonUrls(request.variant)

    setLoadedSchematics(
      cachedCircuitJsons ? { variant: request.variant, circuitJsons: cachedCircuitJsons } : null,
    )
    setError("")
    setIsLoading(!cachedCircuitJsons)

    void Promise.all(circuitJsonUrls.map((url) => loadPrebuiltCircuitJson({ url, forceReload })))
      .then((circuitJsons) => {
        if (requestIndex !== requestIndexRef.current) return
        setLoadedSchematics({ variant: request.variant, circuitJsons })
      })
      .catch((loadError: unknown) => {
        if (requestIndex !== requestIndexRef.current) return
        setError(loadError instanceof Error ? loadError.message : String(loadError))
      })
      .finally(() => {
        if (requestIndex === requestIndexRef.current) setIsLoading(false)
      })

    void preloadTiEvmSchematicVariants({ evm: request.evm }).catch(() => undefined)
  }, [request.evm, request.loadSchematics, request.retryIndex, request.variant])

  const cachedCircuitJsons = request.loadSchematics
    ? getCachedTiEvmVariantSchematics({ variant: request.variant })
    : undefined
  const circuitJsons =
    loadedSchematics?.variant === request.variant
      ? loadedSchematics.circuitJsons
      : (cachedCircuitJsons ?? [])

  return {
    circuitJsons,
    error,
    isLoading: request.loadSchematics && isLoading && circuitJsons.length === 0,
  }
}
