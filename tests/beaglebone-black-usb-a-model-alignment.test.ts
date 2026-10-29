import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { getCadModelReplacement } from "../scripts/prebuild-ti-evm-cad-scenes/get-cad-model-replacement"
import type { SourceFootprintByComponentName } from "../scripts/prebuild-ti-evm-cad-scenes/read-source-footprints"
import { replacePrimitiveCadModels } from "../scripts/prebuild-ti-evm-cad-scenes/replace-primitive-cad-models"

function isPoint3(value: unknown): value is { x: number; y: number; z: number } {
  if (typeof value !== "object" || value === null) return false
  return (
    "x" in value &&
    typeof value.x === "number" &&
    "y" in value &&
    typeof value.y === "number" &&
    "z" in value &&
    typeof value.z === "number"
  )
}

test("offsets the BeagleBone Black USB-A shell from its short imported body", () => {
  const replacement = getCadModelReplacement({
    altiumFootprint: "USB_A_SH",
    componentName: "P3",
  })

  expect(replacement?.kind).toBe("jscad")
  if (replacement?.kind !== "jscad") throw new Error("Expected a JSCAD replacement")

  expect(replacement.modelPlanarOffsetMillimeters).toEqual({ x: 0, y: -5.275 })

  const sourceFootprintByComponentName: SourceFootprintByComponentName = new Map([
    ["P3", "USB_A_SH"],
  ])
  const circuitJson = [
    {
      type: "source_component",
      source_component_id: "source_component_p3",
      ftype: "simple_chip",
      name: "P3",
    },
    {
      type: "pcb_component",
      pcb_component_id: "pcb_component_p3",
      source_component_id: "source_component_p3",
      center: { x: 1, y: 2 },
      width: 5.25,
      height: 15.17,
      layer: "top",
      rotation: 90,
    },
    {
      type: "cad_component",
      cad_component_id: "cad_component_p3",
      source_component_id: "source_component_p3",
      pcb_component_id: "pcb_component_p3",
      position: { x: 1, y: 2, z: 0.8 },
      rotation: { x: 0, y: 0, z: 90 },
      show_as_bounding_box: true,
    },
  ] satisfies AnyCircuitElement[]
  const enriched = replacePrimitiveCadModels({ circuitJson, sourceFootprintByComponentName })
  const cadComponent = enriched.circuitJson.find(
    (element) =>
      element.type === "cad_component" && element.cad_component_id === "cad_component_p3",
  )

  const position = cadComponent?.position
  expect(isPoint3(position)).toBe(true)
  if (!isPoint3(position)) throw new Error("Expected a 3D CAD position")
  expect(position.x).toBeCloseTo(6.275)
  expect(position.y).toBeCloseTo(2)
  expect(position.z).toBe(0.8)
})
