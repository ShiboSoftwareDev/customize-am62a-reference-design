import type { AnyCircuitElement } from "circuit-json"
import { useEffect, useRef, useState } from "react"
import { loadPrebuiltCircuitJson } from "app/load-prebuilt-circuit-json"
import { getTiEvmVariantSchematicCircuitJsonUrls, type TiEvmVariant } from "lib/ti-evm-catalog"

type EvmRenderState = {
  pcbCircuitJson: AnyCircuitElement[] | null
  schematicCircuitJsons: AnyCircuitElement[][]
  error: string
  isLoading: boolean
  elapsedMs: number
}

type LoadedEvmRender = {
  variant: TiEvmVariant
  pcbCircuitJson: AnyCircuitElement[] | null
  schematicCircuitJsons: AnyCircuitElement[][]
}

export function useEvmRender(request: {
  variant: TiEvmVariant
  retryIndex: number
}): EvmRenderState {
  const [loadedRender, setLoadedRender] = useState<LoadedEvmRender | null>(null)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [elapsedMs, setElapsedMs] = useState(0)
  const requestIndexRef = useRef(0)
  const retryIndexRef = useRef(request.retryIndex)

  useEffect(() => {
    const requestIndex = ++requestIndexRef.current
    const forceReload = retryIndexRef.current !== request.retryIndex
    retryIndexRef.current = request.retryIndex
    const startedAt = performance.now()
    const interval = window.setInterval(() => setElapsedMs(performance.now() - startedAt), 100)
    setLoadedRender({
      variant: request.variant,
      pcbCircuitJson: null,
      schematicCircuitJsons: [],
    })
    setIsLoading(true)
    setError("")
    setElapsedMs(0)

    void (async () => {
      try {
        const pcbUrl = request.variant.circuitJsonUrl
        const schematicCircuitJsonUrls = getTiEvmVariantSchematicCircuitJsonUrls(request.variant)
        const pcbCircuitJsonPromise = loadPrebuiltCircuitJson({ url: pcbUrl, forceReload })
        const [nextPcbCircuitJson, nextSchematicCircuitJsons] = await Promise.all([
          pcbCircuitJsonPromise,
          Promise.all(
            schematicCircuitJsonUrls.map((schematicUrl) =>
              schematicUrl === pcbUrl
                ? pcbCircuitJsonPromise
                : loadPrebuiltCircuitJson({ url: schematicUrl, forceReload }),
            ),
          ),
        ])
        if (requestIndex !== requestIndexRef.current) return
        setLoadedRender({
          variant: request.variant,
          pcbCircuitJson: nextPcbCircuitJson,
          schematicCircuitJsons: nextSchematicCircuitJsons,
        })
      } catch (loadError) {
        if (requestIndex === requestIndexRef.current) {
          setError(loadError instanceof Error ? loadError.message : String(loadError))
        }
      } finally {
        if (requestIndex === requestIndexRef.current) {
          window.clearInterval(interval)
          setElapsedMs(performance.now() - startedAt)
          setIsLoading(false)
        }
      }
    })()

    return () => {
      window.clearInterval(interval)
    }
  }, [request.variant, request.retryIndex])

  if (loadedRender?.variant !== request.variant) {
    return {
      pcbCircuitJson: null,
      schematicCircuitJsons: [],
      error: "",
      isLoading: true,
      elapsedMs: 0,
    }
  }

  return {
    pcbCircuitJson: loadedRender.pcbCircuitJson,
    schematicCircuitJsons: loadedRender.schematicCircuitJsons,
    error,
    isLoading,
    elapsedMs,
  }
}
