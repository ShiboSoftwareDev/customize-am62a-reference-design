import { mkdir } from "node:fs/promises"
import { resolve } from "node:path"
import { convertCircuitJsonToCadScene } from "./convert-circuit-json-to-cad-scene"
import { extractStepProduct } from "./extract-step-product"

export async function prebuildBeaglePlayConnectorModel(): Promise<void> {
  const referenceUrl =
    "https://raw.githubusercontent.com/beagleboard/beagleplay/7a59a98ae27dc4fd9e2bd8975ff90cdb44a366ea/Design/beagleplayv10_a2_board_3D_20221219.stp"
  const response = await fetch(referenceUrl)
  if (!response.ok) throw new Error(`Failed to download BeaglePlay STEP: ${response.status}`)
  const step = await response.text()
  const productName = "HDMI19P_1D155_23_1X7_7X16_4MM"
  const temporaryDirectory = resolve("tmp/reference-connector-models")
  await mkdir(temporaryDirectory, { recursive: true })
  const modelStepPath = resolve(temporaryDirectory, "beagleplay-hdmi.step")
  await Bun.write(modelStepPath, extractStepProduct({ step, productName }))
  const glb = await convertCircuitJsonToCadScene({
    publicDirectory: "/",
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
        width: 7.88,
        height: 23.1,
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
  await Bun.write("public/cad-models/beagleplay-hdmi.glb", glb)
}
