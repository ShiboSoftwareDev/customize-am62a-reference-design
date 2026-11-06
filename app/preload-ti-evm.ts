import type { AnyCircuitElement } from "circuit-json"
import {
  getCachedPrebuiltCircuitJson,
  loadPrebuiltCircuitJson,
  retainPrebuiltCircuitJsonCache,
  type PrebuiltCircuitJsonUrl,
} from "app/load-prebuilt-circuit-json"
import {
  getTiEvmVariantSchematicCircuitJsonUrls,
  type TiEvm,
  type TiEvmId,
  type TiEvmVariant,
} from "lib/ti-evm-catalog"

const schematicPreloadPromises = new Map<TiEvmId, Promise<void>>()
const retainedCircuitJsonUrlsByEvmId = new Map<TiEvmId, PrebuiltCircuitJsonUrl[]>()
const schematicPreloadBatchSize = 16
const retainedEvmCount = 2

export async function preloadTiEvmPcbVariants({
  evm,
  signal,
}: {
  evm: TiEvm
  signal?: AbortSignal
}): Promise<void> {
  for (const { circuitJsonUrl } of evm.variants) {
    if (getCachedPrebuiltCircuitJson({ url: circuitJsonUrl })) continue
    await waitForBrowserIdle()
    // A fetch already in progress can also serve the foreground PCB request.
    if (signal?.aborted) return
    await loadPrebuiltCircuitJson({ url: circuitJsonUrl })
  }
}

export function preloadTiEvmSchematicVariants({ evm }: { evm: TiEvm }): Promise<void> {
  const existingPreload = schematicPreloadPromises.get(evm.id)
  if (existingPreload) return existingPreload

  const schematicCircuitJsonUrls = [
    ...new Set(evm.variants.flatMap(getTiEvmVariantSchematicCircuitJsonUrls)),
  ]
  const preloadPromise = preloadCircuitJsonUrlsInBatches({
    circuitJsonUrls: schematicCircuitJsonUrls,
    batchSize: schematicPreloadBatchSize,
  }).catch((error: unknown) => {
    schematicPreloadPromises.delete(evm.id)
    throw error
  })
  schematicPreloadPromises.set(evm.id, preloadPromise)
  return preloadPromise
}

export function getCachedTiEvmVariantSchematics({
  variant,
}: {
  variant: TiEvmVariant
}): AnyCircuitElement[][] | undefined {
  const schematicCircuitJsons = getTiEvmVariantSchematicCircuitJsonUrls(variant).map((url) =>
    getCachedPrebuiltCircuitJson({ url }),
  )

  if (schematicCircuitJsons.some((circuitJson) => circuitJson === undefined)) return undefined
  return schematicCircuitJsons.filter(
    (circuitJson): circuitJson is AnyCircuitElement[] => circuitJson !== undefined,
  )
}

export function retainTiEvmCircuitJsonCache({ evm }: { evm: TiEvm }): void {
  const evmCircuitJsonUrls = evm.variants.flatMap((variant) => [
    variant.circuitJsonUrl,
    ...getTiEvmVariantSchematicCircuitJsonUrls(variant),
  ])
  retainedCircuitJsonUrlsByEvmId.delete(evm.id)
  retainedCircuitJsonUrlsByEvmId.set(evm.id, evmCircuitJsonUrls)

  while (retainedCircuitJsonUrlsByEvmId.size > retainedEvmCount) {
    const leastRecentlyUsedEvmId = retainedCircuitJsonUrlsByEvmId.keys().next().value
    if (leastRecentlyUsedEvmId === undefined) break
    retainedCircuitJsonUrlsByEvmId.delete(leastRecentlyUsedEvmId)
  }

  retainPrebuiltCircuitJsonCache({
    urls: [...retainedCircuitJsonUrlsByEvmId.values()].flat(),
  })

  for (const evmId of schematicPreloadPromises.keys()) {
    if (!retainedCircuitJsonUrlsByEvmId.has(evmId)) schematicPreloadPromises.delete(evmId)
  }
}

export function clearTiEvmPreloadCache(): void {
  schematicPreloadPromises.clear()
  retainedCircuitJsonUrlsByEvmId.clear()
}

async function preloadCircuitJsonUrlsInBatches({
  circuitJsonUrls,
  batchSize,
}: {
  circuitJsonUrls: PrebuiltCircuitJsonUrl[]
  batchSize: number
}): Promise<void> {
  for (
    let batchStartIndex = 0;
    batchStartIndex < circuitJsonUrls.length;
    batchStartIndex += batchSize
  ) {
    const circuitJsonUrlBatch = circuitJsonUrls.slice(batchStartIndex, batchStartIndex + batchSize)
    await Promise.all(
      circuitJsonUrlBatch.map((url) =>
        getCachedPrebuiltCircuitJson({ url }) ? undefined : loadPrebuiltCircuitJson({ url }),
      ),
    )
  }
}

function waitForBrowserIdle(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve()

  return new Promise((resolve) => {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(() => resolve(), { timeout: 500 })
      return
    }
    globalThis.setTimeout(resolve, 0)
  })
}
