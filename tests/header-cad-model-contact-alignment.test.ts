import { expect, test } from "bun:test"
import jscad from "@jscad/modeling"
import { parsePrebuiltCircuitJson } from "../app/parse-prebuilt-circuit-json"
import { readGlbGoldContactMesh } from "./fixtures/read-glb-gold-contact-mesh"

test("prebuilt header models contact the TI pads and holes on both board sides", async () => {
  const headerCases = [
    { boardId: "tmds62levm", componentNames: ["J6", "J10", "J11", "J16", "J18"] },
    { boardId: "sk-am62", componentNames: ["J10", "J17"] },
    { boardId: "beaglebone-black", componentNames: ["P2"] },
  ]
  const missedContacts: string[] = []
  let checkedContactCount = 0
  for (const { boardId, componentNames } of headerCases) {
    const directory = `public/prebuilt-ti-evms/${boardId}`
    const circuitJson = parsePrebuiltCircuitJson(
      new Uint8Array(await Bun.file(`${directory}/full-board.circuit.json.gz`).arrayBuffer()),
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
      const contacts = readGlbGoldContactMesh({ componentName, glb })
      const boardNormalDirection = pcbComponent.layer === "bottom" ? -1 : 1
      const pads = circuitJson.filter(
        (element) =>
          (element.type === "pcb_smtpad" || element.type === "pcb_plated_hole") &&
          element.pcb_component_id === pcbComponent.pcb_component_id,
      )
      expect(pads.length).toBeGreaterThan(0)
      for (const pad of pads) {
        if (typeof pad.x !== "number" || typeof pad.y !== "number") {
          throw new Error("Missing pad coordinates")
        }
        const contactProbe = jscad.primitives.cuboid({
          center: [
            pad.x,
            pad.y,
            pad.type === "pcb_plated_hole"
              ? 0
              : boardNormalDirection * (pcbBoard.thickness / 2 + 0.15),
          ],
          size: [0.05, 0.05, 0.05],
        })
        const contactVolume = jscad.measurements.measureVolume(
          jscad.booleans.intersect(contacts, contactProbe),
        )
        if (contactVolume < 0.00012) {
          missedContacts.push(`${boardId} ${componentName} ${JSON.stringify(pad.port_hints)}`)
        }
        checkedContactCount += 1
      }
    }
  }
  expect(checkedContactCount).toBe(100)
  expect(missedContacts).toEqual([])
})
