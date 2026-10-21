import { afterEach, expect, mock, test } from "bun:test"
import { clearPrebuiltCircuitJsonCache } from "app/load-prebuilt-circuit-json"
import { clearTiEvmPreloadCache, preloadTiEvmPcbVariants } from "app/preload-ti-evm"
import { tiEvms } from "lib/ti-evm-catalog"

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
  clearPrebuiltCircuitJsonCache()
  clearTiEvmPreloadCache()
})

test("opening a board preloads every PCB variant", async () => {
  const fetchMock = mock(async (_url: RequestInfo | URL) => Response.json([]))
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: fetchMock,
    writable: true,
  })
  const evm = tiEvms[0]

  await preloadTiEvmPcbVariants({ evm })

  expect(fetchMock).toHaveBeenCalledTimes(evm.variants.length)
  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(
    evm.variants.map(({ circuitJsonUrl }) => circuitJsonUrl),
  )
})
