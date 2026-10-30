import { expect, test } from "bun:test"
import { resolve } from "node:path"
import type { AnyCircuitElement } from "circuit-json"
import { parsePrebuiltCircuitJson } from "../app/parse-prebuilt-circuit-json"

type CircuitPoint = { x: number; y: number }
type PolygonCopperPour = AnyCircuitElement & {
  layer: string
  pcb_copper_pour_id: string
  points: CircuitPoint[]
  shape: "polygon"
  type: "pcb_copper_pour"
}

test("SK-AM62 minimal board removes R323 HDMI copper with the multimedia feature", async () => {
  const sourceCircuitJson = await loadCircuitJson(
    "lib/generated/ti-evms/sk-am62.source.circuit.json.gz",
  )
  const fullBoardCircuitJson = await loadCircuitJson(
    "public/prebuilt-ti-evms/sk-am62/full-board.circuit.json.gz",
  )
  const minimalBoardCircuitJson = await loadCircuitJson(
    "public/prebuilt-ti-evms/sk-am62/minimal-board.circuit.json.gz",
  )
  const r323CopperPour = sourceCircuitJson.find(
    (element): element is PolygonCopperPour =>
      isPolygonCopperPour(element) &&
      element.pcb_copper_pour_id === "pcb_pcb_copper_pour_altium_polygon_26",
  )
  if (!r323CopperPour) throw new Error("SK-AM62 source is missing the R323 copper pour")

  expect(hasComponent({ circuitJson: fullBoardCircuitJson, componentName: "R323" })).toBe(true)
  const sourceNet = sourceCircuitJson.find(
    (element) =>
      element.type === "source_net" && element.source_net_id === r323CopperPour.source_net_id,
  )
  if (!sourceNet || typeof sourceNet.name !== "string")
    throw new Error("R323 copper has no source net")
  const netName = sourceNet.name
  const layer = r323CopperPour.layer
  expect(hasMatchingCopperPour({ circuitJson: fullBoardCircuitJson, netName, layer })).toBe(true)
  expect(hasComponent({ circuitJson: minimalBoardCircuitJson, componentName: "R323" })).toBe(false)
  expect(hasMatchingCopperPour({ circuitJson: minimalBoardCircuitJson, netName, layer })).toBe(
    false,
  )
})

async function loadCircuitJson(repositoryRelativePath: string): Promise<AnyCircuitElement[]> {
  const circuitJsonPath = resolve(import.meta.dir, "..", repositoryRelativePath)
  return parsePrebuiltCircuitJson(new Uint8Array(await Bun.file(circuitJsonPath).arrayBuffer()))
}

function hasComponent(params: {
  circuitJson: AnyCircuitElement[]
  componentName: string
}): boolean {
  return params.circuitJson.some(
    (element) => element.type === "source_component" && element.name === params.componentName,
  )
}

function hasMatchingCopperPour({
  circuitJson,
  netName,
  layer,
}: {
  circuitJson: AnyCircuitElement[]
  netName: string
  layer: string
}): boolean {
  const netIds = new Set(
    circuitJson.flatMap((element) =>
      element.type === "source_net" && element.name === netName ? [element.source_net_id] : [],
    ),
  )
  return circuitJson.some(
    (element) =>
      element.type === "pcb_copper_pour" &&
      element.layer === layer &&
      netIds.has(element.source_net_id),
  )
}

function isPolygonCopperPour(element: AnyCircuitElement): element is PolygonCopperPour {
  return (
    element.type === "pcb_copper_pour" &&
    element.shape === "polygon" &&
    Array.isArray(element.points) &&
    element.points.every(
      (point) =>
        typeof point === "object" &&
        point !== null &&
        "x" in point &&
        typeof point.x === "number" &&
        "y" in point &&
        typeof point.y === "number",
    )
  )
}
