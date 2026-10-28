import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToGltf } from "circuit-json-to-gltf"
import { createUsbAConnectorCadModel } from "../scripts/prebuild-ti-evm-cad-scenes/create-usb-connector-cad-model"
import { createTwoTerminalCadModel } from "../scripts/prebuild-ti-evm-cad-scenes/create-two-terminal-cad-model"

test("preserves authored materials in enriched CAD scenes", async () => {
  const circuitJson = [
    {
      type: "source_component",
      source_component_id: "source_component_1",
      ftype: "simple_chip",
      name: "J1",
    },
    {
      type: "pcb_component",
      pcb_component_id: "pcb_component_1",
      source_component_id: "source_component_1",
      center: { x: 0, y: 0 },
      width: 14.2,
      height: 15.8,
      layer: "top",
      rotation: 0,
    },
    {
      type: "cad_component",
      cad_component_id: "cad_component_1",
      source_component_id: "source_component_1",
      pcb_component_id: "pcb_component_1",
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      model_jscad: createUsbAConnectorCadModel(),
    },
  ] satisfies AnyCircuitElement[]

  const glb = await convertCircuitJsonToGltf(circuitJson, { format: "glb" })
  if (!(glb instanceof ArrayBuffer)) throw new Error("Expected a GLB ArrayBuffer")

  const materialColors = readGlbMaterialColors(glb)
  expect(materialColors).toContainEqual([0.58, 0.62, 0.66, 1])
  expect(materialColors).toContainEqual([0.035, 0.04, 0.05, 1])
  expect(materialColors).toContainEqual([0.83, 0.58, 0.12, 1])
})

test("preserves ceramic and terminal materials for chip capacitors", async () => {
  const circuitJson = [
    {
      type: "source_component",
      source_component_id: "source_component_1",
      ftype: "simple_chip",
      name: "C1",
    },
    {
      type: "pcb_component",
      pcb_component_id: "pcb_component_1",
      source_component_id: "source_component_1",
      center: { x: 0, y: 0 },
      width: 1,
      height: 0.5,
      layer: "top",
      rotation: 0,
    },
    {
      type: "cad_component",
      cad_component_id: "cad_component_1",
      source_component_id: "source_component_1",
      pcb_component_id: "pcb_component_1",
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      model_jscad: createTwoTerminalCadModel({ kind: "capacitor", packageSize: "0402" }),
    },
  ] satisfies AnyCircuitElement[]

  const glb = await convertCircuitJsonToGltf(circuitJson, { format: "glb" })
  if (!(glb instanceof ArrayBuffer)) throw new Error("Expected a GLB ArrayBuffer")

  const materialColors = readGlbMaterialColors(glb)
  expect(materialColors).toContainEqual([0.78, 0.64, 0.42, 1])
  expect(materialColors).toContainEqual([0.68, 0.7, 0.72, 1])
})

function readGlbMaterialColors(glb: ArrayBuffer): number[][] {
  const glbBytes = new Uint8Array(glb)
  const dataView = new DataView(glb)
  const jsonChunkLength = dataView.getUint32(12, true)
  const jsonChunk = glbBytes.slice(20, 20 + jsonChunkLength)
  const gltf = JSON.parse(new TextDecoder().decode(jsonChunk).trim()) as {
    materials?: Array<{
      pbrMetallicRoughness?: { baseColorFactor?: number[] }
    }>
  }
  return (
    gltf.materials?.flatMap((material) => {
      const color = material.pbrMetallicRoughness?.baseColorFactor
      return color ? [color] : []
    }) ?? []
  )
}
