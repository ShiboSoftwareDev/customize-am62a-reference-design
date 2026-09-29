import { mkdir, rm, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import type { CircuitJson } from "circuit-json"
import { convertCircuitJsonToGltf, getBestCameraPosition } from "circuit-json-to-gltf"
import { convertCircuitJsonToPcbSvg, convertCircuitJsonToSchematicSvg } from "circuit-to-svg"
import { gunzipSync, strFromU8 } from "fflate"
import { renderGLTFToPNGFromGLB } from "poppygl"
import { tiEvms } from "../lib/ti-evm-catalog"

const repositoryRoot = resolve(import.meta.dir, "..")
const outputRoot = resolve(repositoryRoot, "public/board-details")

await rm(outputRoot, { recursive: true, force: true })

for (const evm of tiEvms) {
  const outputDirectory = resolve(outputRoot, evm.id)
  await mkdir(outputDirectory, { recursive: true })

  const fullBoard = evm.variants.find(({ id }) => id === "full-board")
  if (!fullBoard) throw new Error(`${evm.name} has no full-board variant`)

  const circuitJson = await readCompressedCircuitJson(fullBoard.circuitJsonUrl)
  const pcbSvg = stripTrailingWhitespace(
    convertCircuitJsonToPcbSvg(circuitJson, {
      backgroundColor: "#07100c",
      drawPaddingOutsideBoard: true,
      height: 900,
      includeVersion: true,
      matchBoardAspectRatio: true,
      shouldDrawErrors: true,
      width: 1200,
    }),
  )
  const schematicSvg = stripTrailingWhitespace(
    convertCircuitJsonToSchematicSvg(circuitJson, {
      height: 900,
      includeVersion: true,
      width: 1200,
    }),
  )
  const threeDimensionalPng = await renderThreeDimensionalPng(circuitJson)

  await Promise.all([
    writeFile(resolve(outputDirectory, "pcb.svg"), pcbSvg),
    writeFile(resolve(outputDirectory, "schematic.svg"), schematicSvg),
    writeFile(resolve(outputDirectory, "3d.png"), threeDimensionalPng),
    Bun.write(
      resolve(outputDirectory, "source.tsx"),
      Bun.file(resolve(repositoryRoot, evm.sourcePath)),
    ),
  ])
}

console.log(`Prebuilt PCB, schematic, 3D, and TSX details for ${tiEvms.length} TI EVMs`)

async function readCompressedCircuitJson(publicUrl: string): Promise<CircuitJson> {
  const inputPath = resolve(repositoryRoot, "public", publicUrl.replace(/^\//u, ""))
  const compressed = new Uint8Array(await Bun.file(inputPath).arrayBuffer())
  return JSON.parse(strFromU8(gunzipSync(compressed))) as CircuitJson
}

function stripTrailingWhitespace(svg: string): string {
  return svg.replace(/[ \t]+$/gmu, "")
}

async function renderThreeDimensionalPng(circuitJson: CircuitJson): Promise<Uint8Array> {
  const glb = await convertCircuitJsonToGltf(circuitJson, {
    boardDrillQuality: "high",
    boardTextureResolution: 2048,
    format: "glb",
  })
  if (!(glb instanceof ArrayBuffer)) throw new Error("3D conversion did not return a GLB")

  return renderGLTFToPNGFromGLB(glb, {
    ...getBestCameraPosition(circuitJson, { aspectRatio: 4 / 3 }),
    backgroundColor: "#07100c",
    height: 900,
    supersampling: 2,
    width: 1200,
  })
}
