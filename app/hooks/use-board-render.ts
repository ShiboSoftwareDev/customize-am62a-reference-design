import type { AnyCircuitElement } from "circuit-json"
import { useEffect, useRef, useState } from "react"
import { getSelectionCacheKey, type OptionalModuleSelection } from "lib/module-config"
import { parseBoardRenderResponse } from "app/parse-board-render-response"
import { readCachedRender, writeCachedRender } from "app/render-cache"

type BoardRenderState = {
  circuitJson: AnyCircuitElement[] | null
  error: string
  isRendering: boolean
  elapsedMs: number
  loadedFromCache: boolean
}

export function useBoardRender(params: {
  selection: OptionalModuleSelection
  addPours: boolean
  retryIndex: number
}): BoardRenderState {
  const [circuitJson, setCircuitJson] = useState<AnyCircuitElement[] | null>(null)
  const [error, setError] = useState("")
  const [isRendering, setIsRendering] = useState(true)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [loadedFromCache, setLoadedFromCache] = useState(false)
  const requestIndexRef = useRef(0)

  useEffect(() => {
    const requestIndex = ++requestIndexRef.current
    const abortController = new AbortController()
    const startedAt = performance.now()
    const cacheKey = getSelectionCacheKey(params)
    const interval = window.setInterval(() => setElapsedMs(performance.now() - startedAt), 100)
    let debounceTimeout = 0

    setIsRendering(true)
    setError("")
    setLoadedFromCache(false)
    setElapsedMs(0)

    debounceTimeout = window.setTimeout(async () => {
      try {
        const cachedCircuitJson = await readCachedRender(cacheKey)
        if (abortController.signal.aborted) return
        if (cachedCircuitJson) {
          setCircuitJson(cachedCircuitJson)
          setLoadedFromCache(true)
          return
        }

        const response = await fetch("/api/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selection: params.selection, addPours: params.addPours }),
          signal: abortController.signal,
        })
        const responseBody = await parseBoardRenderResponse(response)
        if (requestIndex !== requestIndexRef.current) return
        setCircuitJson(responseBody.circuitJson)
        await writeCachedRender({ key: cacheKey, circuitJson: responseBody.circuitJson })
      } catch (renderError) {
        if (!abortController.signal.aborted && requestIndex === requestIndexRef.current) {
          setError(renderError instanceof Error ? renderError.message : String(renderError))
        }
      } finally {
        if (!abortController.signal.aborted && requestIndex === requestIndexRef.current) {
          setElapsedMs(performance.now() - startedAt)
          setIsRendering(false)
        }
      }
    }, 250)

    return () => {
      window.clearTimeout(debounceTimeout)
      window.clearInterval(interval)
      abortController.abort()
    }
  }, [params.selection, params.addPours, params.retryIndex])

  return { circuitJson, error, isRendering, elapsedMs, loadedFromCache }
}
