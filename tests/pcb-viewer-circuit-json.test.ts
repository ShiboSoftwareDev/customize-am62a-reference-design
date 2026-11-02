import { expect, test } from "bun:test"
import { getPcbViewerCircuitJson } from "app/get-pcb-viewer-circuit-json"
import { parsePrebuiltCircuitJson } from "app/parse-prebuilt-circuit-json"
import { tiEvms } from "lib/ti-evm-catalog"
import { isPcbBoard } from "../scripts/ti-evm-reference-generator/circuit-json-elements"

test("PCB presentation preserves physical primitives and cutouts that overlap the board", async () => {
  for (const evm of tiEvms) {
    for (const variant of evm.variants.filter((variant) => variant.id === "full-board")) {
      const circuitJson = parsePrebuiltCircuitJson(
        await Bun.file(new URL(`../public${variant.circuitJsonUrl}`, import.meta.url)).bytes(),
      )
      const originalCircuitJson = structuredClone(circuitJson)
      const presentedCircuitJson = getPcbViewerCircuitJson(circuitJson)
      const physicalElements = circuitJson.filter(
        (element) =>
          element.type !== "pcb_cutout" &&
          !element.type.startsWith("pcb_silkscreen_") &&
          !element.type.startsWith("pcb_fabrication_note_"),
      )
      const physicalElementSet = new Set(physicalElements)
      expect(presentedCircuitJson.filter((element) => physicalElementSet.has(element))).toEqual(
        physicalElements,
      )
      expect(circuitJson).toEqual(originalCircuitJson)
    }
  }

  const circuitJson = parsePrebuiltCircuitJson(
    await Bun.file(
      new URL("../public/prebuilt-ti-evms/sk-am62/full-board.circuit.json.gz", import.meta.url),
    ).bytes(),
  )
  const board = circuitJson.find(isPcbBoard)
  const cutout = circuitJson.find((element) => element.type === "pcb_cutout")
  if (!board || cutout?.shape !== "polygon") throw new Error("Missing SK-AM62 board geometry")
  const internalCutout = {
    ...cutout,
    points: [
      { x: board.center.x, y: board.center.y },
      { x: board.center.x + 1, y: board.center.y },
      { x: board.center.x, y: board.center.y + 1 },
    ],
  }
  const overlappingCutout = {
    ...cutout,
    points: [
      { x: board.center.x, y: board.center.y + board.height / 2 - 1 },
      { x: board.center.x + 1, y: board.center.y + board.height / 2 + 1 },
      { x: board.center.x - 1, y: board.center.y + board.height / 2 + 1 },
    ],
  }
  expect(getPcbViewerCircuitJson([board, internalCutout, overlappingCutout])).toEqual([
    board,
    internalCutout,
    overlappingCutout,
  ])
  expect(getPcbViewerCircuitJson([cutout])).toEqual([cutout])

  const crossingSilkscreenLine = {
    type: "pcb_silkscreen_line",
    x1: board.center.x,
    y1: board.center.y,
    x2: board.center.x + board.width,
    y2: board.center.y,
  }
  const externalSilkscreenLine = {
    ...crossingSilkscreenLine,
    y1: board.center.y + board.height,
    y2: board.center.y + board.height,
  }
  expect(getPcbViewerCircuitJson([board, crossingSilkscreenLine, externalSilkscreenLine])).toEqual([
    board,
    crossingSilkscreenLine,
  ])
}, 60_000)
