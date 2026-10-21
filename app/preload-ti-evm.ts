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

const pcbPreloadPromises = new Map<TiEvmId, Promise<void>>()
const schematicPreloadPromises = new Map<TiEvmId, Promise<void>>()
const schematicPreloadBatchSize = 16

export function preloadTiEvmPcbVariants({ evm }: { evm: TiEvm }): Promise<void> {
  const existingPreload = pcbPreloadPromises.get(evm.id)
  if (existingPreload) return existingPreload

  const preloadPromise = preloadCircuitJsonUrls(
    evm.variants.map(({ circuitJsonUrl }) => circuitJsonUrl),
  ).catch((error: unknown) => {
    pcbPreloadPromises.delete(evm.id)
    throw error
  })
  pcbPreloadPromises.set(evm.id, preloadPromise)
  return preloadPromise
}

export function preloadTiEvmSchematicVariants({ evm }: { evm: TiEvm }): Promise<void> {
  const existingPreload = schematicPreloadPromises.get(evm.id)
  if (existingPreload) return existingPreload

  const schematicCircuitJsonUrls = evm.variants.flatMap(getTiEvmVariantSchematicCircuitJsonUrls)
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
  retainPrebuiltCircuitJsonCache({
    urls: evm.variants.flatMap((variant) => [
      variant.circuitJsonUrl,
      ...getTiEvmVariantSchematicCircuitJsonUrls(variant),
    ]),
  })

  for (const evmId of pcbPreloadPromises.keys()) {
    if (evmId !== evm.id) pcbPreloadPromises.delete(evmId)
  }
  for (const evmId of schematicPreloadPromises.keys()) {
    if (evmId !== evm.id) schematicPreloadPromises.delete(evmId)
  }
}

export function clearTiEvmPreloadCache(): void {
  pcbPreloadPromises.clear()
  schematicPreloadPromises.clear()
}

async function preloadCircuitJsonUrls(circuitJsonUrls: PrebuiltCircuitJsonUrl[]): Promise<void> {
  for (const url of circuitJsonUrls) {
    if (getCachedPrebuiltCircuitJson({ url })) continue
    await waitForBrowserIdle()
    await loadPrebuiltCircuitJson({ url })
  }
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
