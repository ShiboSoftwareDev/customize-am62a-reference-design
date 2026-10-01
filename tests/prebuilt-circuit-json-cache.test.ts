import { afterEach, expect, mock, test } from "bun:test"
import {
  clearPrebuiltCircuitJsonCache,
  loadPrebuiltCircuitJson,
} from "app/load-prebuilt-circuit-json"

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
  clearPrebuiltCircuitJsonCache()
})

test("prebuilt Circuit JSON is fetched and parsed once per asset URL", async () => {
  const circuitJson = [{ type: "source_component", source_component_id: "U1", name: "U1" }]
  const fetchMock = mock(async () => Response.json(circuitJson))
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: fetchMock,
    writable: true,
  })

  const [firstLoad, concurrentLoad] = await Promise.all([
    loadPrebuiltCircuitJson({ url: "/board.circuit.json.gz" }),
    loadPrebuiltCircuitJson({ url: "/board.circuit.json.gz" }),
  ])
  const cachedLoad = await loadPrebuiltCircuitJson({ url: "/board.circuit.json.gz" })

  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(firstLoad).toBe(concurrentLoad)
  expect(firstLoad).toBe(cachedLoad)
})
