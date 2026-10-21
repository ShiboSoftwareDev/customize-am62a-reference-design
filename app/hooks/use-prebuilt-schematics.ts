import type { AnyCircuitElement } from "circuit-json"
import { useEffect, useRef, useState } from "react"
import {
  getDisplayedSchematics,
  type DisplayedSchematics,
} from "app/hooks/get-displayed-schematics"
import { loadPrebuiltCircuitJson } from "app/load-prebuilt-circuit-json"
import { getCachedTiEvmVariantSchematics, preloadTiEvmSchematicVariants } from "app/preload-ti-evm"
import {
  getTiEvmVariantSchematicCircuitJsonUrls,
  type TiEvm,
  type TiEvmVariant,
} from "lib/ti-evm-catalog"

export function usePrebuiltSchematics(request: {
  evm: TiEvm
  variant: TiEvmVariant
  loadSchematics: boolean
  retryIndex: number
}): {
  circuitJsons: AnyCircuitElement[][]
  variant: TiEvmVariant | null
  error: string
  isLoading: boolean
} {
  const [displayedSchematics, setDisplayedSchematics] = useState<DisplayedSchematics | null>(null)
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

    setDisplayedSchematics((previousSchematics) =>
      getDisplayedSchematics({
        evmId: request.evm.id,
        variant: request.variant,
        cachedCircuitJsons,
        previousSchematics,
      }),
    )
    setError("")
    setIsLoading(!cachedCircuitJsons)

    void Promise.all(circuitJsonUrls.map((url) => loadPrebuiltCircuitJson({ url, forceReload })))
      .then((circuitJsons) => {
        if (requestIndex !== requestIndexRef.current) return
        setDisplayedSchematics({
          evmId: request.evm.id,
          variant: request.variant,
          circuitJsons,
        })
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
  const visibleSchematics = request.loadSchematics
    ? getDisplayedSchematics({
        evmId: request.evm.id,
        variant: request.variant,
        cachedCircuitJsons,
        previousSchematics: displayedSchematics,
      })
    : null

  return {
    circuitJsons: visibleSchematics?.circuitJsons ?? [],
    variant: visibleSchematics?.variant ?? null,
    error,
    isLoading: request.loadSchematics && isLoading,
  }
}
