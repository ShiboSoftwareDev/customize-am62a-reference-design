import { expect, test } from "bun:test"
import jscad from "@jscad/modeling"
import type { AnyCircuitElement } from "circuit-json"
import { tiEvms } from "../lib/ti-evm-catalog"
import { isPointInsideMeshSection } from "./fixtures/is-point-inside-mesh-section"
import { readGlbComponentMesh } from "./fixtures/read-glb-component-mesh"
import { readPrebuiltPackageReview } from "./fixtures/read-prebuilt-package-review"

const beaglePlay = tiEvms.find((board) => board.id === "beagleplay")!

test("seats the BeaglePlay UART and vertical USB-A connectors without overlap", async () => {
  for (const variant of beaglePlay.variants) {
    const { circuitJson, glb } = await readPrebuiltPackageReview(beaglePlay.id, variant.id)
    const uart = readGlbComponentMesh({ glb, componentName: "J6" })
    const usb = readGlbComponentMesh({ glb, componentName: "J13" })
    const [, uartMax] = jscad.measurements.measureBoundingBox(uart)
    const [usbMin, usbMax] = jscad.measurements.measureBoundingBox(usb)

    expect(usbMin[0] - uartMax[0]).toBeGreaterThan(1.5)
    // The reference USB receptacle is 14.47 mm high above the PCB surface.
    const board = circuitJson.find((element) => element.type === "pcb_board")
    if (typeof board?.thickness !== "number") throw new Error("Missing PCB thickness")
    expect(usbMax[2] - board.thickness / 2).toBeCloseTo(14.47, 2)

    const uartHoles = getConnectorHoles({ circuitJson, componentName: "J6" })
    const usbHoles = getConnectorHoles({ circuitJson, componentName: "J13" })
    expect(uartHoles).toHaveLength(3)
    expect(usbHoles).toHaveLength(7)
    for (const { x, y } of uartHoles) {
      expect(isPointInsideMeshSection({ mesh: uart, point: [x, y, 0] })).toBe(true)
    }
    for (const { x, y } of usbHoles) {
      expect(isPointInsideMeshSection({ mesh: usb, point: [x, y, 0] })).toBe(true)
    }
  }
}, 60_000)

function getConnectorHoles({
  circuitJson,
  componentName,
}: {
  circuitJson: AnyCircuitElement[]
  componentName: string
}) {
  const source = circuitJson.find(
    (element) => element.type === "source_component" && element.name === componentName,
  )
  const component = circuitJson.find(
    (element) =>
      element.type === "pcb_component" &&
      element.source_component_id === source?.source_component_id,
  )
  if (!component) throw new Error(`Missing PCB component ${componentName}`)
  return circuitJson.flatMap((element) => {
    if (
      element.type !== "pcb_plated_hole" ||
      element.pcb_component_id !== component.pcb_component_id
    )
      return []
    if (typeof element.x !== "number" || typeof element.y !== "number") {
      throw new Error(`Missing plated hole coordinates for ${componentName}`)
    }
    return [{ x: element.x, y: element.y }]
  })
}
