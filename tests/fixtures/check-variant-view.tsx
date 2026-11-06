import assert from "node:assert/strict"
import { mock } from "bun:test"
import { GlobalRegistrator } from "@happy-dom/global-registrator"
import type { AnyCircuitElement } from "circuit-json"
import { act } from "react"

GlobalRegistrator.register({ url: "http://localhost" })
Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { value: true })
mock.module("@tscircuit/pcb-viewer", () => ({
  PCBViewer: ({ circuitJson }: { circuitJson: AnyCircuitElement[] }) => (
    <canvas data-loaded-variant={circuitJson[0]?.source_component_id} />
  ),
}))
mock.module("@tscircuit/schematic-viewer", () => ({ SchematicViewer: () => <svg /> }))

const pendingMinimalLoads: Array<(response: Response) => void> = []
globalThis.fetch = Object.assign(
  async (url: RequestInfo | URL) => {
    const path = String(url)
    if (path.endsWith("/sk-am62/minimal-board.circuit.json.gz")) {
      return new Promise<Response>((resolve) => pendingMinimalLoads.push(resolve))
    }
    if (path.includes(".schematic-")) return Response.json([])
    return Response.json([{ type: "source_component", source_component_id: path }])
  },
  { preconnect: fetch.preconnect },
)

const { createRoot } = await import("react-dom/client")
const { App } = await import("app/App")
const root = createRoot(document.body)

async function changeSelect(select: HTMLSelectElement, option: string) {
  select.value = option
  assert.equal(select.value, option)
  await act(async () => select.dispatchEvent(new Event("change", { bubbles: true })))
}

function getButton(label: string) {
  const button = [...document.querySelectorAll("button")].find(
    (element) => element.textContent?.trim() === label,
  )
  assert(button, label)
  return button
}

try {
  await act(async () => root.render(<App />))
  const [board, variant] = document.querySelectorAll<HTMLSelectElement>(
    ".configuration-panel select",
  )
  await changeSelect(board, "sk-am62")
  const canvas = document.querySelector("canvas")
  assert(canvas)
  assert(canvas?.dataset.loadedVariant?.endsWith("/sk-am62/full-board.circuit.json.gz"))
  assert.equal(getButton("Export PCB Circuit JSON").disabled, false)

  await changeSelect(variant, "minimal-board")
  assert.equal(document.querySelector("canvas"), canvas)
  assert.equal(getButton("Export PCB Circuit JSON").disabled, true)
  assert.equal(document.querySelector(".design-viewer")?.getAttribute("aria-busy"), "true")
  await act(async () => pendingMinimalLoads.shift()?.(new Response(null, { status: 503 })))
  assert.equal(document.querySelector("canvas"), canvas)
  assert.match(document.querySelector(".render-error")?.textContent ?? "", /503/)
  assert.equal(getButton("Export PCB Circuit JSON").disabled, true)

  await act(async () => getButton("Retry load").click())
  await act(async () =>
    pendingMinimalLoads.shift()?.(
      Response.json([{ type: "source_component", source_component_id: "minimal-board" }]),
    ),
  )
  assert.equal(document.querySelector("canvas"), canvas)
  assert.equal(canvas.dataset.loadedVariant, "minimal-board")
  assert.equal(getButton("Export PCB Circuit JSON").disabled, false)

  await act(async () => getButton("Schematic").click())
  await changeSelect(variant, "full-board")
  const sheet = document.querySelector<HTMLSelectElement>('[aria-label="Schematic sheet"]')
  assert(sheet)
  await changeSelect(sheet, "36.SchDoc")
  await changeSelect(variant, "minimal-board")
  assert.equal(sheet.value, "01.SchDoc")
  await changeSelect(variant, "full-board")
  assert.equal(sheet.value, "36.SchDoc")
} finally {
  await act(async () => root.unmount())
  await GlobalRegistrator.unregister()
}
