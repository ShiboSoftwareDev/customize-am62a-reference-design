import type { AnyCircuitElement } from "circuit-json"
import { useEffect, useRef, useState } from "react"
import { parsePrebuiltCircuitJson } from "app/parse-prebuilt-circuit-json"
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

  useEffect(() => {
    const requestIndex = ++requestIndexRef.current
    const abortController = new AbortController()
    const startedAt = performance.now()
    const interval = window.setInterval(() => setElapsedMs(performance.now() - startedAt), 100)
    setIsLoading(true)
    setError("")
    setElapsedMs(0)
    setPcbCircuitJson(null)
    setSchematicCircuitJson(null)

    void (async () => {
      try {
        const nextCircuitJson = await loadCircuitJson(
          request.variant.circuitJsonUrl,
          abortController.signal,
        )
        if (requestIndex !== requestIndexRef.current) return
        setPcbCircuitJson(nextCircuitJson)
        setSchematicCircuitJson(nextCircuitJson)
      } catch (loadError) {
        if (!abortController.signal.aborted && requestIndex === requestIndexRef.current) {
          setError(loadError instanceof Error ? loadError.message : String(loadError))
        }
      } finally {
        if (!abortController.signal.aborted && requestIndex === requestIndexRef.current) {
          window.clearInterval(interval)
          setElapsedMs(performance.now() - startedAt)
          setIsLoading(false)
        }
      }
    })()

    return () => {
      window.clearInterval(interval)
      abortController.abort()
    }
  }, [request.variant, request.retryIndex])

  return { pcbCircuitJson, schematicCircuitJson, error, isLoading, elapsedMs }
}

async function loadCircuitJson(url: string, signal: AbortSignal): Promise<AnyCircuitElement[]> {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`Prebuilt EVM failed to load (${response.status})`)
  return parsePrebuiltCircuitJson(new Uint8Array(await response.arrayBuffer()))
}
