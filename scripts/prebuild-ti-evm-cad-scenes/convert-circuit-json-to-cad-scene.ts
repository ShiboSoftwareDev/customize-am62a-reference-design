import { resolve } from "node:path"
import type { AnyCircuitElement, CadComponent } from "circuit-json"
import { convertCircuitJsonToGltf, type CoordinateTransformConfig } from "circuit-json-to-gltf"

export async function convertCircuitJsonToCadScene({
  circuitJson,
  publicDirectory,
  coordinateTransform,
}: {
  circuitJson: AnyCircuitElement[]
  publicDirectory: string
  coordinateTransform?: CoordinateTransformConfig
}): Promise<ArrayBuffer> {
  const cadScene = await convertCircuitJsonToGltf(
    resolveLocalCadModelUrls({ circuitJson, publicDirectory }),
    {
      boardDrillQuality: "high",
      boardTextureResolution: 1024,
      format: "glb",
      coordinateTransform,
    },
  )
  if (!(cadScene instanceof ArrayBuffer)) {
    throw new Error("3D conversion did not return a GLB")
  }
  return cadScene
}

function resolveLocalCadModelUrls({
  circuitJson,
  publicDirectory,
}: {
  circuitJson: AnyCircuitElement[]
  publicDirectory: string
}): AnyCircuitElement[] {
  return circuitJson.map((element) => {
    if (element.type !== "cad_component") return element
    return {
      ...element,
      model_step_url: resolveLocalModelUrl(element.model_step_url, publicDirectory),
      model_glb_url: resolveLocalModelUrl(element.model_glb_url, publicDirectory),
    } satisfies CadComponent
  })
}

function resolveLocalModelUrl(
  modelUrl: string | undefined,
  publicDirectory: string,
): string | undefined {
  if (!modelUrl?.startsWith("/")) return modelUrl
  return resolve(publicDirectory, modelUrl.replace(/^\//u, ""))
}
