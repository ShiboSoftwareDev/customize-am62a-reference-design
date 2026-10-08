import { expect } from "bun:test"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { basename, dirname, resolve } from "node:path"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToGltf, getBestCameraPosition } from "circuit-json-to-gltf"
import { decode } from "fast-png"
import { renderGLTFToPNGFromGLB } from "poppygl"
import { parsePrebuiltCircuitJson } from "app/parse-prebuilt-circuit-json"
import type { TiEvmId } from "lib/ti-evm-catalog"

type BoardViewName = "bottom" | "top"
type SnapshotName = "generated" | "source"
type CircuitJson = AnyCircuitElement[]
type CadComponentElement = AnyCircuitElement & {
  type: "cad_component"
  model_step_url?: string
}
type PcbBoardElement = AnyCircuitElement & { type: "pcb_board" }

const MAX_CHANNEL_DIFFERENCE = 7
const MAX_DIFFERENT_PIXEL_FRACTION = 0.06
const TOP_CAMERA_DIRECTION = [-0.7, 1.2, -0.8] as const
const BOTTOM_CAMERA_DIRECTION = [-0.7, -1.2, -0.8] as const

function isCadComponentElement(element: AnyCircuitElement): element is CadComponentElement {
  return (
    element.type === "cad_component" &&
    (element.model_step_url === undefined || typeof element.model_step_url === "string")
  )
}

async function readCompressedCircuitJson(artifactPath: string): Promise<CircuitJson> {
  const artifactBytes = new Uint8Array(await Bun.file(artifactPath).arrayBuffer())
  return parsePrebuiltCircuitJson(artifactBytes)
}

function resolveLocalCadModelUrls(circuitJson: CircuitJson): CircuitJson {
  const publicDirectory = resolve(import.meta.dir, "../../public")
  return circuitJson.map((element) => {
    if (!isCadComponentElement(element) || !element.model_step_url?.startsWith("/")) {
      return element
    }
    return {
      ...element,
      model_step_url: resolve(publicDirectory, element.model_step_url.replace(/^\//u, "")),
    } satisfies CadComponentElement
  })
}

async function renderBoardView({
  boardViewName,
  cameraReferenceBoard,
  circuitJson,
}: {
  boardViewName: BoardViewName
  cameraReferenceBoard: PcbBoardElement
  circuitJson: CircuitJson
}): Promise<Uint8Array> {
  const glb = await convertCircuitJsonToGltf(resolveLocalCadModelUrls(circuitJson), {
    boardTextureResolution: 1024,
    format: "glb",
  })
  if (!(glb instanceof ArrayBuffer)) {
    throw new Error("3D conversion did not return a GLB")
  }
  const direction = boardViewName === "top" ? TOP_CAMERA_DIRECTION : BOTTOM_CAMERA_DIRECTION
  return renderGLTFToPNGFromGLB(glb, {
    ...getBestCameraPosition([cameraReferenceBoard], {
      aspectRatio: 4 / 3,
      direction,
    }),
    backgroundColor: "#07100c",
    height: 600,
    width: 800,
  })
}

async function expectPngSnapshot({
  renderedPng,
  snapshotPath,
}: {
  renderedPng: Uint8Array
  snapshotPath: string
}): Promise<void> {
  const shouldUpdateSnapshots =
    process.env.BUN_UPDATE_SNAPSHOTS === "1" || process.env.BUN_FORCE_UPDATE_SNAPSHOTS === "1"
  if (shouldUpdateSnapshots) {
    await mkdir(dirname(snapshotPath), { recursive: true })
    await writeFile(snapshotPath, renderedPng)
  }
  expect(await Bun.file(snapshotPath).exists()).toBe(true)

  const renderedImage = decode(renderedPng)
  const snapshotImage = decode(await readFile(snapshotPath))
  expect(renderedImage.width).toBe(snapshotImage.width)
  expect(renderedImage.height).toBe(snapshotImage.height)
  expect(renderedImage.channels).toBe(snapshotImage.channels)

  let differentPixelCount = 0
  const pixelCount = renderedImage.width * renderedImage.height
  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    const firstChannelIndex = pixelIndex * renderedImage.channels
    let pixelIsDifferent = false
    for (let channelIndex = 0; channelIndex < renderedImage.channels; channelIndex += 1) {
      const sampleIndex = firstChannelIndex + channelIndex
      const channelDifference = Math.abs(
        (renderedImage.data[sampleIndex] ?? 0) - (snapshotImage.data[sampleIndex] ?? 0),
      )
      if (channelDifference > MAX_CHANNEL_DIFFERENCE) {
        pixelIsDifferent = true
        break
      }
    }
    if (pixelIsDifferent) differentPixelCount += 1
  }
  expect(differentPixelCount / pixelCount).toBeLessThanOrEqual(MAX_DIFFERENT_PIXEL_FRACTION)
}

async function expectBoardSnapshots({
  cameraReferenceBoard,
  circuitJson,
  evmId,
  snapshotName,
  testPath,
}: {
  cameraReferenceBoard: PcbBoardElement
  circuitJson: CircuitJson
  evmId: TiEvmId
  snapshotName: SnapshotName
  testPath: string
}): Promise<void> {
  const testName = basename(testPath).replace(/\.test\.tsx?$/u, "")
  for (const boardViewName of ["top", "bottom"] as const) {
    const renderedPng = await renderBoardView({
      boardViewName,
      cameraReferenceBoard,
      circuitJson,
    })
    await expectPngSnapshot({
      renderedPng,
      snapshotPath: resolve(
        dirname(testPath),
        "__snapshots__",
        `${testName}-${snapshotName}-${boardViewName}-3d.snap.png`,
      ),
    })
  }
  expect(
    circuitJson.some(
      (element) =>
        isCadComponentElement(element) && element.model_step_url?.includes(`/ti-evms/${evmId}/`),
    ),
  ).toBe(true)
}

export async function expectTiEvm3dRoundtrip({
  evmId,
  testPath,
}: {
  evmId: TiEvmId
  testPath: string
}): Promise<void> {
  const repositoryRoot = resolve(import.meta.dir, "../..")
  const sourceCircuitJson = await readCompressedCircuitJson(
    resolve(repositoryRoot, `lib/generated/ti-evms/${evmId}.source.circuit.json.gz`),
  )
  const generatedCircuitJson = await readCompressedCircuitJson(
    resolve(repositoryRoot, `public/prebuilt-ti-evms/${evmId}/full-board.circuit.json.gz`),
  )
  const cameraReferenceBoard = sourceCircuitJson.find(
    (element): element is PcbBoardElement => element.type === "pcb_board",
  )
  if (!cameraReferenceBoard) throw new Error(`${evmId} has no PCB board`)

  await expectBoardSnapshots({
    cameraReferenceBoard,
    circuitJson: sourceCircuitJson,
    evmId,
    snapshotName: "source",
    testPath,
  })
  await expectBoardSnapshots({
    cameraReferenceBoard,
    circuitJson: generatedCircuitJson,
    evmId,
    snapshotName: "generated",
    testPath,
  })
}
