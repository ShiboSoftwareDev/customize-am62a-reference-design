import assert from "node:assert/strict"
import { mock } from "bun:test"
import { GlobalRegistrator } from "@happy-dom/global-registrator"
import { act } from "react"

GlobalRegistrator.register({ url: "http://localhost" })
Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { value: true })
mock.module("@tscircuit/pcb-viewer", () => ({ PCBViewer: () => <canvas /> }))
mock.module("@tscircuit/3d-viewer", () => ({ CadViewer: () => <canvas /> }))

const pcbRequests: string[] = []
globalThis.fetch = Object.assign(
  async (url: RequestInfo | URL) => {
    pcbRequests.push(String(url))
    return Response.json([])
  },
  { preconnect: fetch.preconnect },
)
let downloadedFileName = ""
HTMLAnchorElement.prototype.click = function () {
  downloadedFileName = this.download
}

const { createRoot } = await import("react-dom/client")
const { App } = await import("app/App")
const root = createRoot(document.body)

async function clickButton(label: string) {
  const button = [...document.querySelectorAll("button")].find(
    (button) => button.textContent?.trim() === label,
  )
  assert(button && !button.disabled, label)
  await act(async () => button.click())
}

async function changeSelection(label: string, optionId: string) {
  const select = [...document.querySelectorAll("label")]
    .find((labelElement) => labelElement.querySelector("span")?.textContent === label)
    ?.querySelector("select")
  assert(select, label)
  select.value = optionId
  await act(async () => select.dispatchEvent(new Event("change", { bubbles: true })))
}

try {
  await act(async () => root.render(<App />))
  const initialPcbUrl = "/prebuilt-ti-evms/tmds62levm/full-board.circuit.json.gz"
  const minimalPcbUrl = "/prebuilt-ti-evms/sk-am62/minimal-board.circuit.json.gz"
  assert.deepEqual(pcbRequests, [initialPcbUrl])

  await clickButton("3D")
  await changeSelection("Board", "sk-am62")
  await changeSelection("Variant", "minimal-board")
  assert.deepEqual(pcbRequests, [initialPcbUrl])

  await clickButton("Export PCB Circuit JSON")
  assert.equal(downloadedFileName, "sk-am62-minimal-board.circuit.json")
  assert.deepEqual(pcbRequests, [initialPcbUrl, minimalPcbUrl])

  await clickButton("PCB")
  assert.deepEqual(pcbRequests, [initialPcbUrl, minimalPcbUrl])
} finally {
  await act(async () => root.unmount())
  await GlobalRegistrator.unregister()
}
