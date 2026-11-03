import { mkdir } from "node:fs/promises"
import type { CoordinateTransformConfig } from "circuit-json-to-gltf"
import { resolve } from "node:path"
import { convertCircuitJsonToCadScene } from "./convert-circuit-json-to-cad-scene"
import { extractStepProduct } from "./extract-step-product"

export async function prebuildStepProductModel({
  step,
  productName,
  outputName,
  excludedProductNames,
  coordinateTransform,
}: {
  step: string
  productName: string
  outputName: string
  excludedProductNames?: string[]
  coordinateTransform?: CoordinateTransformConfig
}): Promise<void> {
  const temporaryDirectory = resolve("tmp/reference-connector-models")
  await mkdir(temporaryDirectory, { recursive: true })
  const modelStepPath = resolve(temporaryDirectory, `${outputName}.step`)
  await Bun.write(modelStepPath, extractStepProduct({ step, productName, excludedProductNames }))
  const glb = await convertCircuitJsonToCadScene({
    publicDirectory: "/",
    coordinateTransform,
    circuitJson: [
      {
        type: "source_component",
        source_component_id: "source_model",
        name: productName,
        ftype: "simple_chip",
      },
      {
        type: "pcb_component",
        pcb_component_id: "pcb_model",
        source_component_id: "source_model",
        center: { x: 0, y: 0 },
        width: 1,
        height: 1,
        layer: "top",
        rotation: 0,
      },
      {
        type: "cad_component",
        cad_component_id: "cad_model",
        pcb_component_id: "pcb_model",
        source_component_id: "source_model",
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        model_origin_position: { x: 0, y: 0, z: 0 },
        model_step_url: modelStepPath,
      },
    ],
  })
  await Bun.write(`public/cad-models/${outputName}.glb`, glb)
}
