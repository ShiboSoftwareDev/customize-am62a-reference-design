import { afterEach, expect, mock, test } from "bun:test"
import {
  clearPrebuiltCircuitJsonCache,
  getCachedPrebuiltCircuitJson,
  loadPrebuiltCircuitJson,
  retainPrebuiltCircuitJsonCache,
} from "app/load-prebuilt-circuit-json"

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
  clearPrebuiltCircuitJsonCache()
})

test("does not restore an evicted board after an in-flight load completes", async () => {
  let resolveResponse: (response: Response) => void = () => undefined
  const fetchMock = mock(
    () =>
      new Promise<Response>((resolve) => {
        resolveResponse = resolve
      }),
  )
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: fetchMock,
    writable: true,
  })
  const evictedBoardUrl = "/evicted-board.circuit.json.gz"
  const loadPromise = loadPrebuiltCircuitJson({ url: evictedBoardUrl })

  retainPrebuiltCircuitJsonCache({ urls: ["/selected-board.circuit.json.gz"] })
  resolveResponse(Response.json([]))

  await expect(loadPromise).rejects.toThrow("Prebuilt Circuit JSON load was evicted")
  expect(getCachedPrebuiltCircuitJson({ url: evictedBoardUrl })).toBeUndefined()
})
