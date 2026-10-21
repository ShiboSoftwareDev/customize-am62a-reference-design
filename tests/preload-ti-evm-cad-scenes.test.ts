import { afterEach, expect, mock, test } from "bun:test"
import { clearTiEvmPreloadCache, preloadTiEvmCadScenes } from "app/preload-ti-evm"
import { tiEvms } from "lib/ti-evm-catalog"

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
  clearTiEvmPreloadCache()
})

test("opening a board 3D view preloads every CAD scene", async () => {
  const fetchMock = mock(async (_url: RequestInfo | URL) => new Response(new ArrayBuffer(8)))
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: fetchMock,
    writable: true,
  })
  const evm = tiEvms[0]

  await preloadTiEvmCadScenes({ evm })

  expect(fetchMock).toHaveBeenCalledTimes(evm.variants.length)
  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(
    evm.variants.map(({ prebuiltCadSceneUrl }) => prebuiltCadSceneUrl),
  )
})
