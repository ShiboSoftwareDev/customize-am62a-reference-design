import type { AnyCircuitElement } from "circuit-json"
import { useEffect, useRef, useState } from "react"
import {
  getCachedPrebuiltCircuitJson,
  loadPrebuiltCircuitJson,
  type PrebuiltCircuitJsonUrl,
} from "app/load-prebuilt-circuit-json"
import type { TiEvm, TiEvmId, TiEvmVariant } from "lib/ti-evm-catalog"

type LoadedPcb = {
  evmId: TiEvmId
  circuitJsonUrl: PrebuiltCircuitJsonUrl
  circuitJson: AnyCircuitElement[]
}

export function usePrebuiltPcb(request: {
  evm: TiEvm
  variant: TiEvmVariant
  loadPcb: boolean
  retryIndex: number
}): {
  circuitJson: AnyCircuitElement[] | null
  error: string
  isLoading: boolean
  hasCurrentPcb: boolean
  elapsedMs: number
} {
  const [loadedPcb, setLoadedPcb] = useState<LoadedPcb | null>(null)
  const [failedPcb, setFailedPcb] = useState<{
    circuitJsonUrl: PrebuiltCircuitJsonUrl
    message: string
  } | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const requestIndexRef = useRef(0)
  const retryIndexRef = useRef(request.retryIndex)

  useEffect(() => {
    if (!request.loadPcb) {
      retryIndexRef.current = request.retryIndex
      setLoadedPcb(null)
      setFailedPcb(null)
      return
    }

    const requestIndex = ++requestIndexRef.current
    const forceReload = retryIndexRef.current !== request.retryIndex
    retryIndexRef.current = request.retryIndex
    const circuitJsonUrl = request.variant.circuitJsonUrl
    const cachedCircuitJson = forceReload
      ? undefined
      : getCachedPrebuiltCircuitJson({ url: circuitJsonUrl })
    const startedAt = performance.now()
    const interval = window.setInterval(() => setElapsedMs(performance.now() - startedAt), 100)

    if (cachedCircuitJson) {
      setLoadedPcb({ evmId: request.evm.id, circuitJsonUrl, circuitJson: cachedCircuitJson })
    }
    setFailedPcb(null)
    setElapsedMs(0)

    void loadPrebuiltCircuitJson({ url: circuitJsonUrl, forceReload })
      .then((circuitJson) => {
        if (requestIndex !== requestIndexRef.current) return
        setLoadedPcb({ evmId: request.evm.id, circuitJsonUrl, circuitJson })
      })
      .catch((loadError: unknown) => {
        if (requestIndex !== requestIndexRef.current) return
        setFailedPcb({
          circuitJsonUrl,
          message: loadError instanceof Error ? loadError.message : String(loadError),
        })
      })
      .finally(() => {
        if (requestIndex !== requestIndexRef.current) return
        window.clearInterval(interval)
        setElapsedMs(performance.now() - startedAt)
      })

    return () => {
      requestIndexRef.current++
      window.clearInterval(interval)
    }
  }, [request.evm, request.loadPcb, request.retryIndex, request.variant])

  const cachedCircuitJson = getCachedPrebuiltCircuitJson({
    url: request.variant.circuitJsonUrl,
  })
  const currentCircuitJson =
    loadedPcb?.circuitJsonUrl === request.variant.circuitJsonUrl
      ? loadedPcb.circuitJson
      : cachedCircuitJson
  const previousCircuitJson = loadedPcb?.evmId === request.evm.id ? loadedPcb.circuitJson : null
  const error =
    failedPcb?.circuitJsonUrl === request.variant.circuitJsonUrl ? failedPcb.message : ""

  return {
    circuitJson: request.loadPcb ? (currentCircuitJson ?? previousCircuitJson) : null,
    error: request.loadPcb ? error : "",
    isLoading: request.loadPcb && !currentCircuitJson && !error,
    hasCurrentPcb: request.loadPcb && Boolean(currentCircuitJson),
    elapsedMs,
  }
}
