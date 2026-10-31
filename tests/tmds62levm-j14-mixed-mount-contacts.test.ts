import { expect, test } from "bun:test"
import jscad from "@jscad/modeling"
import type { Geom3 } from "@jscad/modeling/src/geometries/types"
import { executeCadModelOperation } from "./fixtures/execute-cad-model-operation"
import { parsePrebuiltCircuitJson } from "../app/parse-prebuilt-circuit-json"
import { getCadModelReplacement } from "../scripts/prebuild-ti-evm-cad-scenes/get-cad-model-replacement"

function isPoint2(point: unknown): point is { x: number; y: number } {
  return (
    typeof point === "object" &&
    point !== null &&
    "x" in point &&
    typeof point.x === "number" &&
    "y" in point &&
    typeof point.y === "number"
  )
}

test("J14 contacts reach all five through-holes and ten SMT pads in the TI footprint", async () => {
  const replacement = getCadModelReplacement({
    altiumFootprint: "HDR_5X3_TSM-105-01-T-TM_S_S_9-9",
    componentName: "J14",
  })
  if (replacement?.kind !== "jscad") throw new Error("Expected a JSCAD replacement")
  const bodies: Geom3[] = replacement.jscadOperations.map(executeCadModelOperation)
  const bounds = jscad.measurements.measureAggregateBoundingBox(bodies)
  expect(bounds[0][2]).toBeCloseTo(-3.81, 6)
  expect(bounds[1][2]).toBeCloseTo(2.54 + 5.84, 6)
  const circuitJson = parsePrebuiltCircuitJson(
    new Uint8Array(
      await Bun.file("public/prebuilt-ti-evms/tmds62levm/full-board.circuit.json.gz").arrayBuffer(),
    ),
  )
  const sourceComponent = circuitJson.find(
    (element) => element.type === "source_component" && element.name === "J14",
  )
  const pcbComponent = circuitJson.find(
    (element) =>
      element.type === "pcb_component" &&
      element.source_component_id === sourceComponent?.source_component_id,
  )
  if (pcbComponent?.type !== "pcb_component" || !isPoint2(pcbComponent.center)) {
    throw new Error("Missing reference J14")
  }
  expect(pcbComponent.rotation).toBe(0)

  const pads = circuitJson.filter(
    (element) =>
      (element.type === "pcb_smtpad" || element.type === "pcb_plated_hole") &&
      element.pcb_component_id === pcbComponent.pcb_component_id,
  )
  expect(pads).toHaveLength(15)
  for (const pad of pads) {
    if (typeof pad.x !== "number" || typeof pad.y !== "number")
      throw new Error("Missing pad coordinates")
    const contactProbe = jscad.primitives.cuboid({
      center: [
        pad.x - pcbComponent.center.x,
        pad.y - pcbComponent.center.y,
        pad.type === "pcb_plated_hole" ? -1.6 : 0.5,
      ],
      size: [0.1, 0.1, 0.1],
    })
    const contactVolume = bodies.reduce(
      (volume, body) =>
        volume + jscad.measurements.measureVolume(jscad.booleans.intersect(body, contactProbe)),
      0,
    )
    expect(contactVolume).toBeGreaterThan(0.0009)
  }
})
