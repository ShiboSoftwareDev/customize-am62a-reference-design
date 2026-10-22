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

test("retains parsed Circuit JSON for the current and previous boards", async () => {
  const fetchMock = mock(async () => Response.json([]))
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: fetchMock,
    writable: true,
  })
  const firstBoard = tiEvms[0]
  const secondBoard = tiEvms[1]
  const thirdBoard = tiEvms[2]
  const firstBoardUrl = firstBoard.variants[0].circuitJsonUrl
  const secondBoardUrl = secondBoard.variants[0].circuitJsonUrl
  const thirdBoardUrl = thirdBoard.variants[0].circuitJsonUrl

  const firstBoardCircuitJson = await loadPrebuiltCircuitJson({ url: firstBoardUrl })
  retainTiEvmCircuitJsonCache({ evm: firstBoard })
  retainTiEvmCircuitJsonCache({ evm: secondBoard })
  const secondBoardCircuitJson = await loadPrebuiltCircuitJson({ url: secondBoardUrl })

  expect(getCachedPrebuiltCircuitJson({ url: firstBoardUrl })).toBe(firstBoardCircuitJson)
  expect(getCachedPrebuiltCircuitJson({ url: secondBoardUrl })).toBe(secondBoardCircuitJson)

  retainTiEvmCircuitJsonCache({ evm: thirdBoard })
  await loadPrebuiltCircuitJson({ url: thirdBoardUrl })

  expect(getCachedPrebuiltCircuitJson({ url: firstBoardUrl })).toBeUndefined()
  expect(getCachedPrebuiltCircuitJson({ url: secondBoardUrl })).toBe(secondBoardCircuitJson)
})
