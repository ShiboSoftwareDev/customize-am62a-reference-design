import { expect, test } from "bun:test"
import { getPcbViewerCircuitJson } from "app/get-pcb-viewer-circuit-json"
import { parsePrebuiltCircuitJson } from "app/parse-prebuilt-circuit-json"
import { tiEvms } from "lib/ti-evm-catalog"
import { isPcbBoard } from "../scripts/ti-evm-reference-generator/circuit-json-elements"

test("PCB presentation preserves electrical geometry and cutouts that overlap the board", async () => {
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
          element.type !== "pcb_copper_text" &&
          (element.type !== "pcb_trace" ||
            Boolean(element.source_trace_id || element.source_net_id)) &&
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
  const unassignedOutsideTrace = {
    type: "pcb_trace",
    pcb_trace_id: "outside-drawing",
    route: [
      {
        route_type: "wire",
        layer: "top",
        width: 0.2,
        x: board.center.x,
        y: board.center.y + board.height,
      },
      {
        route_type: "wire",
        layer: "top",
        width: 0.2,
        x: board.center.x + 1,
        y: board.center.y + board.height,
      },
    ],
  }
  const netAssignedOutsideTrace = { ...unassignedOutsideTrace, source_net_id: "assigned-net" }
  const traceAssignedOutsideTrace = { ...unassignedOutsideTrace, source_trace_id: "assigned-trace" }
  const portAssignedOutsideTrace = {
    ...unassignedOutsideTrace,
    route: unassignedOutsideTrace.route.map((point) => ({ ...point, start_pcb_port_id: "port-1" })),
  }
  const unassignedInsideTrace = {
    ...unassignedOutsideTrace,
    route: unassignedOutsideTrace.route.map((point) => ({ ...point, y: board.center.y })),
  }
  expect(
    getPcbViewerCircuitJson([
      board,
      unassignedOutsideTrace,
      netAssignedOutsideTrace,
      traceAssignedOutsideTrace,
      portAssignedOutsideTrace,
      unassignedInsideTrace,
    ]),
  ).toEqual([
    board,
    netAssignedOutsideTrace,
    traceAssignedOutsideTrace,
    portAssignedOutsideTrace,
    unassignedInsideTrace,
  ])
}, 60_000)
