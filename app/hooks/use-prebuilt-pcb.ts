import type { AnyCircuitElement } from "circuit-json"
import { useEffect, useRef, useState } from "react"
import {
  getCachedPrebuiltCircuitJson,
  loadPrebuiltCircuitJson,
  type PrebuiltCircuitJsonUrl,
} from "app/load-prebuilt-circuit-json"
import { preloadTiEvmPcbVariants } from "app/preload-ti-evm"
import type { TiEvm, TiEvmVariant } from "lib/ti-evm-catalog"

type LoadedPcb = {
  circuitJsonUrl: PrebuiltCircuitJsonUrl
  circuitJson: AnyCircuitElement[]
}

export function usePrebuiltPcb(request: {
  evm: TiEvm
  variant: TiEvmVariant
  retryIndex: number
}): {
  circuitJson: AnyCircuitElement[] | null
  error: string
  isLoading: boolean
  elapsedMs: number
} {
  const [loadedPcb, setLoadedPcb] = useState<LoadedPcb | null>(null)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [elapsedMs, setElapsedMs] = useState(0)
  const requestIndexRef = useRef(0)
  const retryIndexRef = useRef(request.retryIndex)

  useEffect(() => {
    const requestIndex = ++requestIndexRef.current
    const forceReload = retryIndexRef.current !== request.retryIndex
    retryIndexRef.current = request.retryIndex
    const circuitJsonUrl = request.variant.circuitJsonUrl
    const cachedCircuitJson = forceReload
      ? undefined
      : getCachedPrebuiltCircuitJson({ url: circuitJsonUrl })
    const startedAt = performance.now()
    const interval = window.setInterval(() => setElapsedMs(performance.now() - startedAt), 100)

    setLoadedPcb(cachedCircuitJson ? { circuitJsonUrl, circuitJson: cachedCircuitJson } : null)
    setError("")
    setIsLoading(!cachedCircuitJson)
    setElapsedMs(0)

    void loadPrebuiltCircuitJson({ url: circuitJsonUrl, forceReload })
      .then((circuitJson) => {
        if (requestIndex !== requestIndexRef.current) return
        setLoadedPcb({ circuitJsonUrl, circuitJson })
      })
      .catch((loadError: unknown) => {
        if (requestIndex !== requestIndexRef.current) return
        setError(loadError instanceof Error ? loadError.message : String(loadError))
      })
      .finally(() => {
        if (requestIndex !== requestIndexRef.current) return
        window.clearInterval(interval)
        setElapsedMs(performance.now() - startedAt)
        setIsLoading(false)
      })

    void preloadTiEvmPcbVariants({ evm: request.evm }).catch(() => undefined)

    return () => window.clearInterval(interval)
  }, [request.evm, request.retryIndex, request.variant])

  const cachedCircuitJson = getCachedPrebuiltCircuitJson({
    url: request.variant.circuitJsonUrl,
  })
  const circuitJson =
    loadedPcb?.circuitJsonUrl === request.variant.circuitJsonUrl
      ? loadedPcb.circuitJson
      : (cachedCircuitJson ?? null)

  return {
    circuitJson,
    error,
    isLoading: isLoading && !circuitJson,
    elapsedMs,
  }
}
