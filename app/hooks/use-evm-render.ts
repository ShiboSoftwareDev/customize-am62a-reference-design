import type { AnyCircuitElement } from "circuit-json"
import { useEffect, useRef, useState } from "react"
import { loadPrebuiltCircuitJson } from "app/load-prebuilt-circuit-json"
import type { TiEvmVariant } from "lib/ti-evm-catalog"

type EvmRenderState = {
  pcbCircuitJson: AnyCircuitElement[] | null
  schematicCircuitJson: AnyCircuitElement[] | null
  error: string
  isLoading: boolean
  elapsedMs: number
}

export function useEvmRender(request: {
  variant: TiEvmVariant
  retryIndex: number
}): EvmRenderState {
  const [pcbCircuitJson, setPcbCircuitJson] = useState<AnyCircuitElement[] | null>(null)
  const [schematicCircuitJson, setSchematicCircuitJson] = useState<AnyCircuitElement[] | null>(null)
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
    setIsLoading(true)
    setError("")
    setElapsedMs(0)

    void (async () => {
      try {
        const pcbUrl = request.variant.circuitJsonUrl
        const schematicUrl = request.variant.schematicCircuitJsonUrl ?? pcbUrl
        const pcbCircuitJsonPromise = loadPrebuiltCircuitJson({ url: pcbUrl, forceReload })
        const [nextPcbCircuitJson, nextSchematicCircuitJson] = await Promise.all([
          pcbCircuitJsonPromise,
          schematicUrl === pcbUrl
            ? pcbCircuitJsonPromise
            : loadPrebuiltCircuitJson({ url: schematicUrl, forceReload }),
        ])
        if (requestIndex !== requestIndexRef.current) return
        setPcbCircuitJson(nextPcbCircuitJson)
        setSchematicCircuitJson(nextSchematicCircuitJson)
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

  return { pcbCircuitJson, schematicCircuitJson, error, isLoading, elapsedMs }
}
