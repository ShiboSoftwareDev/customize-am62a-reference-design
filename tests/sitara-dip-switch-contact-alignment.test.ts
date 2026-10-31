import { expect, test } from "bun:test"
import jscad from "@jscad/modeling"
import { parsePrebuiltCircuitJson } from "../app/parse-prebuilt-circuit-json"
import { readGlbComponentMesh } from "./fixtures/read-glb-component-mesh"

test("prebuilt DIP banks contact every TI pad at both board placement rotations", async () => {
  const missedContacts: string[] = []
  let checkedContactCount = 0
  for (const { boardId, componentNames } of [
    { boardId: "tmds62levm", componentNames: ["SW1", "SW2", "SW3", "SW4"] },
    { boardId: "sk-am62", componentNames: ["SW1", "SW2"] },
  ]) {
    const directory = `public/prebuilt-ti-evms/${boardId}`
    const circuitJson = parsePrebuiltCircuitJson(
      await Bun.file(`${directory}/full-board.circuit.json.gz`).bytes(),
    )
    const glb = await Bun.file(`${directory}/full-board.glb`).arrayBuffer()
    const pcbBoard = circuitJson.find((element) => element.type === "pcb_board")
    if (typeof pcbBoard?.thickness !== "number") throw new Error("Missing board thickness")
    for (const componentName of componentNames) {
      const sourceComponent = circuitJson.find(
        (element) => element.type === "source_component" && element.name === componentName,
      )
      const pcbComponent = circuitJson.find(
        (element) =>
          element.type === "pcb_component" &&
          element.source_component_id === sourceComponent?.source_component_id,
      )
      if (!pcbComponent) throw new Error(`Missing ${boardId} ${componentName}`)
      const model = readGlbComponentMesh({ componentName, glb })
      const pads = circuitJson.filter(
        (element) =>
          element.type === "pcb_smtpad" &&
          element.pcb_component_id === pcbComponent.pcb_component_id,
      )
      for (const pad of pads) {
        if (typeof pad.x !== "number" || typeof pad.y !== "number")
          throw new Error("Missing pad coordinates")
        const padProbe = jscad.primitives.cuboid({
          center: [pad.x, pad.y, pcbBoard.thickness / 2 + 0.1],
          size: [0.05, 0.05, 0.05],
        })
        const contactVolume = jscad.measurements.measureVolume(
          jscad.booleans.intersect(model, padProbe),
        )
        if (contactVolume < 0.00012)
          missedContacts.push(`${boardId} ${componentName} ${JSON.stringify(pad.port_hints)}`)
        checkedContactCount += 1
      }
    }
  }
  expect(checkedContactCount).toBe(68)
  expect(missedContacts).toEqual([])
})
