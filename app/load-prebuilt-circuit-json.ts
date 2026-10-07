import type { AnyCircuitElement } from "circuit-json"
import { parsePrebuiltCircuitJson } from "app/parse-prebuilt-circuit-json"

type PrebuiltCircuitJsonUrl = string

const circuitJsonCache = new Map<PrebuiltCircuitJsonUrl, Promise<AnyCircuitElement[]>>()

export function loadPrebuiltCircuitJson({
  url,
  forceReload = false,
}: {
  url: string
  forceReload?: boolean
}): Promise<AnyCircuitElement[]> {
  if (forceReload) circuitJsonCache.delete(url)

  const cachedCircuitJson = circuitJsonCache.get(url)
  if (cachedCircuitJson) return cachedCircuitJson

  const circuitJsonPromise = fetch(url, {
    cache: forceReload ? "reload" : "no-cache",
  })
    .then(async (response) => {
      if (!response.ok) throw new Error(`Prebuilt EVM failed to load (${response.status})`)
      return parsePrebuiltCircuitJson(new Uint8Array(await response.arrayBuffer()))
    })
    .catch((error: unknown) => {
      if (circuitJsonCache.get(url) === circuitJsonPromise) circuitJsonCache.delete(url)
      throw error
    })

  circuitJsonCache.set(url, circuitJsonPromise)
  return circuitJsonPromise
}

export function clearPrebuiltCircuitJsonCache(): void {
  circuitJsonCache.clear()
}
