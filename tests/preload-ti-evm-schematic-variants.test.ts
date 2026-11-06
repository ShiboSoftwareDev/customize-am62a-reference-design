import { afterEach, expect, mock, test } from "bun:test"
import { clearPrebuiltCircuitJsonCache } from "app/load-prebuilt-circuit-json"
import { clearTiEvmPreloadCache, preloadTiEvmSchematicVariants } from "app/preload-ti-evm"
import { getTiEvmVariantSchematicCircuitJsonUrls, tiEvms } from "lib/ti-evm-catalog"

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
  clearPrebuiltCircuitJsonCache()
  clearTiEvmPreloadCache()
})

test("opening a board schematic preloads every schematic variant", async () => {
  const fetchMock = mock(async (_url: RequestInfo | URL) => Response.json([]))
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: fetchMock,
    writable: true,
  })
  const evm = tiEvms[3]
  const variantSchematicUrls = evm.variants.flatMap(getTiEvmVariantSchematicCircuitJsonUrls)
  const schematicCircuitJsonUrls = [...new Set(variantSchematicUrls)]

  await preloadTiEvmSchematicVariants({ evm })

  expect(schematicCircuitJsonUrls.length).toBeLessThan(variantSchematicUrls.length)
  expect(fetchMock).toHaveBeenCalledTimes(schematicCircuitJsonUrls.length)
  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(schematicCircuitJsonUrls)
})
