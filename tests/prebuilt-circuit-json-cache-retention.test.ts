import { afterEach, expect, mock, test } from "bun:test"
import {
  clearPrebuiltCircuitJsonCache,
  getCachedPrebuiltCircuitJson,
  loadPrebuiltCircuitJson,
} from "app/load-prebuilt-circuit-json"
import { clearTiEvmPreloadCache, retainTiEvmCircuitJsonCache } from "app/preload-ti-evm"
import { tiEvms } from "lib/ti-evm-catalog"

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
  clearPrebuiltCircuitJsonCache()
  clearTiEvmPreloadCache()
})

test("retains parsed Circuit JSON only for the selected board", async () => {
  const fetchMock = mock(async () => Response.json([]))
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: fetchMock,
    writable: true,
  })
  const firstBoardUrl = tiEvms[0].variants[0].circuitJsonUrl
  const selectedBoard = tiEvms[1]
  const selectedBoardUrl = selectedBoard.variants[0].circuitJsonUrl

  await loadPrebuiltCircuitJson({ url: firstBoardUrl })
  const selectedBoardCircuitJson = await loadPrebuiltCircuitJson({ url: selectedBoardUrl })
  retainTiEvmCircuitJsonCache({ evm: selectedBoard })

  expect(getCachedPrebuiltCircuitJson({ url: firstBoardUrl })).toBeUndefined()
  expect(getCachedPrebuiltCircuitJson({ url: selectedBoardUrl })).toBe(selectedBoardCircuitJson)
})
