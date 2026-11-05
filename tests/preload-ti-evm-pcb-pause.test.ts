import { expect, mock, test } from "bun:test"
import { clearPrebuiltCircuitJsonCache } from "app/load-prebuilt-circuit-json"
import { preloadTiEvmPcbVariants } from "app/preload-ti-evm"
import { tiEvms } from "lib/ti-evm-catalog"

test("pausing PCB preload stops new requests and keeps the completed variant", async () => {
  const evm = tiEvms[0]
  const controller = new AbortController()
  const originalFetch = globalThis.fetch
  const fetchMock = mock(async (_url: RequestInfo | URL) => {
    controller.abort()
    return Response.json([])
  })
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: fetchMock,
    writable: true,
  })

  try {
    await preloadTiEvmPcbVariants({ evm, signal: controller.signal })
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([evm.variants[0].circuitJsonUrl])

    await preloadTiEvmPcbVariants({ evm })
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(
      evm.variants.map(({ circuitJsonUrl }) => circuitJsonUrl),
    )
  } finally {
    globalThis.fetch = originalFetch
    clearPrebuiltCircuitJsonCache()
  }
})
