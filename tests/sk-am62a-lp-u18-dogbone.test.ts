import { expect, test } from "bun:test"
import { resolve } from "node:path"
import type { AnyCircuitElement } from "circuit-json"
import { parsePrebuiltCircuitJson } from "app/parse-prebuilt-circuit-json"

type Point = { x: number; y: number }

test("the prebuilt SK-AM62A-LP keeps U18 C1's package dogbone and via", async () => {
  const circuitJson = await loadFullBoard()
  const sourceComponent = circuitJson.find(
    (element) => element.type === "source_component" && element.name === "U18",
  )
  const sourcePort = circuitJson.find(
    (element) =>
      element.type === "source_port" &&
      element.source_component_id === sourceComponent?.source_component_id &&
      element.name === "C1",
  )
  const pcbPort = circuitJson.find(
    (element) => isPcbPort(element) && element.source_port_id === sourcePort?.source_port_id,
  )

  if (!pcbPort || !isPcbPort(pcbPort)) throw new Error("U18 C1 has no PCB port")
  const dogboneTrace = circuitJson.find(
    (element) =>
      isPcbTrace(element) &&
      element.route.some((routePoint) => distanceBetween(routePoint, pcbPort) < 0.001),
  )

  if (!dogboneTrace || !isPcbTrace(dogboneTrace)) {
    throw new Error("U18 C1 has no package dogbone trace")
  }
  const dogboneEnd = dogboneTrace.route.find(
    (routePoint) => distanceBetween(routePoint, pcbPort) >= 0.001,
  )
  if (!dogboneEnd) throw new Error("U18 C1's dogbone has no via endpoint")

  expect(
    circuitJson.some(
      (element) => isPcbVia(element) && distanceBetween(element, dogboneEnd) < 0.001,
    ),
  ).toBe(true)
})

function distanceBetween(firstPoint: Point, secondPoint: Point): number {
  return Math.hypot(firstPoint.x - secondPoint.x, firstPoint.y - secondPoint.y)
}

function isPoint(point: unknown): point is Point {
  return (
    typeof point === "object" &&
    point !== null &&
    "x" in point &&
    typeof point.x === "number" &&
    "y" in point &&
    typeof point.y === "number"
  )
}

function isPcbPort(element: AnyCircuitElement): element is AnyCircuitElement & Point {
  return element.type === "pcb_port" && isPoint(element)
}

function isPcbTrace(element: AnyCircuitElement): element is AnyCircuitElement & { route: Point[] } {
  return (
    element.type === "pcb_trace" && Array.isArray(element.route) && element.route.every(isPoint)
  )
}

function isPcbVia(element: AnyCircuitElement): element is AnyCircuitElement & Point {
  return element.type === "pcb_via" && isPoint(element)
}

async function loadFullBoard(): Promise<AnyCircuitElement[]> {
  const path = resolve(
    import.meta.dir,
    "../public/prebuilt-ti-evms/sk-am62a-lp/full-board.circuit.json.gz",
  )
  return parsePrebuiltCircuitJson(new Uint8Array(await Bun.file(path).arrayBuffer()))
}
