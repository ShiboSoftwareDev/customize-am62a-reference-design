import assert from "node:assert/strict"
import { mock } from "bun:test"
import { GlobalRegistrator } from "@happy-dom/global-registrator"
import { act } from "react"
import type { Root } from "react-dom/client"
import type { AnyCircuitElement } from "circuit-json"
import { parsePrebuiltCircuitJson } from "app/parse-prebuilt-circuit-json"

function ControlledPcbViewer({ onRenderComplete }: { onRenderComplete?: () => void }) {
  return (
    <button type="button" onClick={onRenderComplete}>
      Finish PCB render
    </button>
  )
}

function getViewer() {
  const viewer = document.querySelector("section.design-viewer")
  assert(viewer, "The real DesignViewer must be mounted")
  return viewer
}

async function finishFrame() {
  const finishButton = [...document.querySelectorAll("button")].find(
    (button) => button.textContent === "Finish PCB render",
  )
  assert(finishButton, "The controlled PCB viewer must be mounted")
  await act(async () => finishButton.click())
}

GlobalRegistrator.register()
Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { value: true, configurable: true })
mock.module("@tscircuit/pcb-viewer", () => ({ PCBViewer: ControlledPcbViewer }))

const { createRoot } = await import("react-dom/client")
const { DesignViewer } = await import("app/components/DesignViewer")

async function renderBoard({
  root,
  circuitJson,
}: {
  root: Root
  circuitJson: AnyCircuitElement[]
}) {
  await act(async () => {
    root.render(
      <DesignViewer
        activeView="pcb"
        boardKey="tmds62levm"
        referenceUrl="https://www.ti.com/tool/TMDS62LEVM"
        prebuiltCadSceneUrl=""
        pcbCircuitJson={circuitJson}
        schematicCircuitJsons={[]}
        schematicSheetLabels={[]}
        isLoading={false}
        onActiveViewChange={() => {}}
      />,
    )
    await Bun.sleep(0)
  })
}

const fullBoard = parsePrebuiltCircuitJson(
  await Bun.file(
    new URL("../../public/prebuilt-ti-evms/tmds62levm/full-board.circuit.json.gz", import.meta.url),
  ).bytes(),
)
const minimalBoard = parsePrebuiltCircuitJson(
  await Bun.file(
    new URL(
      "../../public/prebuilt-ti-evms/tmds62levm/minimal-board.circuit.json.gz",
      import.meta.url,
    ),
  ).bytes(),
)
const container = document.createElement("div")
document.body.append(container)
const root = createRoot(container)

try {
  await renderBoard({ root, circuitJson: fullBoard })
  assert.equal(getViewer().getAttribute("aria-busy"), "true")
  await finishFrame()
  assert.equal(getViewer().getAttribute("aria-busy"), "false")

  await renderBoard({ root, circuitJson: minimalBoard })
  assert.equal(getViewer().getAttribute("aria-busy"), "true")

  // Reuse the exact cached array, without completing the intervening scene.
  await renderBoard({ root, circuitJson: fullBoard })
  assert.equal(
    getViewer().getAttribute("aria-busy"),
    "true",
    "A cached PCB needs completion of its new render request",
  )
  await finishFrame()
  assert.equal(getViewer().getAttribute("aria-busy"), "false")

  await renderBoard({ root, circuitJson: fullBoard })
  assert.equal(getViewer().getAttribute("aria-busy"), "false")
} finally {
  await act(async () => root.unmount())
  GlobalRegistrator.unregister()
}
