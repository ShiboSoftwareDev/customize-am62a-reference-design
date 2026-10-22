import { afterEach, expect, mock, test } from "bun:test"
import { clearPrebuiltCircuitJsonCache } from "app/load-prebuilt-circuit-json"
import {
  clearTiEvmPreloadCache,
  preloadTiEvmPcbVariants,
  retainTiEvmCircuitJsonCache,
} from "app/preload-ti-evm"
import { tiEvms } from "lib/ti-evm-catalog"

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
  clearPrebuiltCircuitJsonCache()
  clearTiEvmPreloadCache()
})

test("returning from another board reuses preloaded variants", async () => {
  const fetchMock = mock(async (_url: RequestInfo | URL) => Response.json([]))
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: fetchMock,
    writable: true,
  })
  const firstBoard = tiEvms[0]
  const secondBoard = tiEvms[1]

  retainTiEvmCircuitJsonCache({ evm: firstBoard })
  await preloadTiEvmPcbVariants({ evm: firstBoard })
  retainTiEvmCircuitJsonCache({ evm: secondBoard })
  await preloadTiEvmPcbVariants({ evm: secondBoard })
  retainTiEvmCircuitJsonCache({ evm: firstBoard })
  await preloadTiEvmPcbVariants({ evm: firstBoard })

  expect(fetchMock).toHaveBeenCalledTimes(firstBoard.variants.length + secondBoard.variants.length)
})
