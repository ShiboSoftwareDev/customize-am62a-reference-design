import { mkdir, rm, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import type { CircuitJson } from "circuit-json"
import { getBestCameraPosition } from "circuit-json-to-gltf"
import { gunzipSync, strFromU8 } from "fflate"
import { renderGLTFToPNGFromGLB, type CameraUp } from "poppygl"
import { tiEvms } from "../lib/ti-evm-catalog"

type QaViewName = "top" | "bottom" | "front" | "back" | "left" | "right"

type QaView = {
  name: QaViewName
  direction: readonly [number, number, number]
  up: CameraUp
}

const repositoryRoot = resolve(import.meta.dir, "..")
const outputRoot = resolve("/tmp/ti-evm-cad-qa")
const qaViews: QaView[] = [
  { name: "top", direction: [0, 1, 0], up: "z-" },
  { name: "bottom", direction: [0, -1, 0], up: "z+" },
  { name: "front", direction: [0, 0, 1], up: "y+" },
  { name: "back", direction: [0, 0, -1], up: "y+" },
  { name: "left", direction: [-1, 0, 0], up: "y+" },
  { name: "right", direction: [1, 0, 0], up: "y+" },
]

await rm(outputRoot, { recursive: true, force: true })
await mkdir(outputRoot, { recursive: true })

for (const evm of tiEvms) {
  const fullBoard = evm.variants.find(({ id }) => id === "full-board")
  if (!fullBoard) throw new Error(`${evm.name} has no full-board variant`)

  const circuitJson = await readCompressedCircuitJson(fullBoard.circuitJsonUrl)
  const glb = await Bun.file(resolvePublicUrl(fullBoard.prebuiltCadSceneUrl)).arrayBuffer()
  const fittedCamera = getBestCameraPosition(circuitJson, { aspectRatio: 4 / 3 })
  const distance = Math.hypot(
    fittedCamera.camPos[0] - fittedCamera.lookAt[0],
    fittedCamera.camPos[1] - fittedCamera.lookAt[1],
    fittedCamera.camPos[2] - fittedCamera.lookAt[2],
  )

  for (const view of qaViews) {
    const png = await renderGLTFToPNGFromGLB(glb, {
      backgroundColor: "#07100c",
      camPos: view.direction.map(
        (directionComponent, axisIndex) =>
          fittedCamera.lookAt[axisIndex] + directionComponent * distance,
      ) as [number, number, number],
      fov: fittedCamera.fov,
      height: 750,
      lookAt: fittedCamera.lookAt,
      supersampling: 1,
      up: view.up,
      width: 1000,
    })
    await writeFile(resolve(outputRoot, `${evm.id}-${view.name}.png`), png)
  }

  for (const variant of evm.variants) {
    const variantCircuitJson = await readCompressedCircuitJson(variant.circuitJsonUrl)
    const variantGlb = await Bun.file(resolvePublicUrl(variant.prebuiltCadSceneUrl)).arrayBuffer()
    const variantCamera = getBestCameraPosition(variantCircuitJson, { aspectRatio: 4 / 3 })
    const png = await renderGLTFToPNGFromGLB(variantGlb, {
      backgroundColor: "#07100c",
      camPos: variantCamera.camPos,
      fov: variantCamera.fov,
      height: 750,
      lookAt: variantCamera.lookAt,
      supersampling: 1,
      up: "y+",
      width: 1000,
    })
    await writeFile(resolve(outputRoot, `${evm.id}-${variant.id}-overview.png`), png)
  }
}

console.log(`Rendered CAD QA views to ${outputRoot}`)

async function readCompressedCircuitJson(publicUrl: string): Promise<CircuitJson> {
  const compressed = new Uint8Array(await Bun.file(resolvePublicUrl(publicUrl)).arrayBuffer())
  return JSON.parse(strFromU8(gunzipSync(compressed))) as CircuitJson
}

function resolvePublicUrl(publicUrl: string): string {
  return resolve(repositoryRoot, "public", publicUrl.replace(/^\//u, ""))
}
