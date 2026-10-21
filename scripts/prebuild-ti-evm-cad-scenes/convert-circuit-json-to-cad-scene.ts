import { resolve } from "node:path"
import type { AnyCircuitElement, CadComponent } from "circuit-json"
import { convertCircuitJsonToGltf } from "circuit-json-to-gltf"

export async function convertCircuitJsonToCadScene({
  circuitJson,
  publicDirectory,
}: {
  circuitJson: AnyCircuitElement[]
  publicDirectory: string
}): Promise<ArrayBuffer> {
  const cadScene = await convertCircuitJsonToGltf(
    resolveLocalCadModelUrls({ circuitJson, publicDirectory }),
    {
      boardDrillQuality: "high",
      boardTextureResolution: 1024,
      format: "glb",
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
    if (element.type !== "cad_component" || !element.model_step_url?.startsWith("/")) {
      return element
    }

    return {
      ...element,
      model_step_url: resolve(publicDirectory, element.model_step_url.replace(/^\//u, "")),
    } satisfies CadComponent
  })
}
