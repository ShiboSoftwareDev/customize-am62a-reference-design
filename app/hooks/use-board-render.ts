import type { AnyCircuitElement } from "circuit-json"
import { useEffect, useRef, useState } from "react"
import { parsePrebuiltCircuitJson } from "app/parse-prebuilt-circuit-json"
import type { BoosterPackConfiguration } from "lib/boosterpack-configurations"

type BoardRenderState = {
  circuitJson: AnyCircuitElement[] | null
  error: string
  isRendering: boolean
  elapsedMs: number
}

export function useBoardRender(params: {
  configuration: BoosterPackConfiguration
  retryIndex: number
}): BoardRenderState {
  const [circuitJson, setCircuitJson] = useState<AnyCircuitElement[] | null>(null)
  const [error, setError] = useState("")
  const [isRendering, setIsRendering] = useState(true)
  const [elapsedMs, setElapsedMs] = useState(0)
  const requestIndexRef = useRef(0)

  useEffect(() => {
    const requestIndex = ++requestIndexRef.current
    const abortController = new AbortController()
    const startedAt = performance.now()
    const interval = window.setInterval(() => setElapsedMs(performance.now() - startedAt), 100)

    setIsRendering(true)
    setError("")
    setElapsedMs(0)

    void (async () => {
      try {
        const response = await fetch(params.configuration.circuitJsonUrl, {
          signal: abortController.signal,
        })
        if (!response.ok) throw new Error(`Prebuilt board failed to load (${response.status})`)
        const compressedBytes = new Uint8Array(await response.arrayBuffer())
        const nextCircuitJson = parsePrebuiltCircuitJson(compressedBytes)
        if (requestIndex === requestIndexRef.current) setCircuitJson(nextCircuitJson)
      } catch (loadError) {
        if (!abortController.signal.aborted && requestIndex === requestIndexRef.current) {
          setError(loadError instanceof Error ? loadError.message : String(loadError))
        }
      } finally {
        if (!abortController.signal.aborted && requestIndex === requestIndexRef.current) {
          window.clearInterval(interval)
          setElapsedMs(performance.now() - startedAt)
          setIsRendering(false)
        }
      }
    })()

    return () => {
      window.clearInterval(interval)
      abortController.abort()
    }
  }, [params.configuration, params.retryIndex])

  return { circuitJson, error, isRendering, elapsedMs }
}
