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
type CircuitPoint3 = { x: number; y: number; z: number }
type PcbComponentId = string
type CadComponentElement = AnyCircuitElement & {
  type: "cad_component"
  layer?: string
  model_glb_url?: string
  model_gltf_url?: string
  model_obj_url?: string
  model_step_url?: string
  model_stl_url?: string
  model_wrl_url?: string
  pcb_component_id?: PcbComponentId
  position: CircuitPoint3
  rotation?: CircuitPoint3
}
type PcbBoardElement = AnyCircuitElement & {
  type: "pcb_board"
}
type PcbComponentElement = AnyCircuitElement & {
  type: "pcb_component"
  layer: string
  pcb_component_id: PcbComponentId
}

const MAX_CHANNEL_DIFFERENCE = 7
const MAX_DIFFERENT_PIXEL_FRACTION = 0.06
const MAX_POSITION_ERROR_MM = 0.03
const MAX_ROTATION_ERROR_DEGREES = 1e-6
const TOP_CAMERA_DIRECTION = [-0.7, 1.2, -0.8] as const
const BOTTOM_CAMERA_DIRECTION = [-0.7, -1.2, -0.8] as const

function isCircuitPoint3(candidate: unknown): candidate is CircuitPoint3 {
  if (typeof candidate !== "object" || candidate === null) return false
  const point = candidate as Record<string, unknown>
  return typeof point.x === "number" && typeof point.y === "number" && typeof point.z === "number"
}

function isCadComponentElement(element: AnyCircuitElement): element is CadComponentElement {
  return element.type === "cad_component" && isCircuitPoint3(element.position)
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

function getCadModelUrl(cadComponent: CadComponentElement): string | undefined {
  return (
    cadComponent.model_glb_url ??
    cadComponent.model_gltf_url ??
    cadComponent.model_obj_url ??
    cadComponent.model_step_url ??
    cadComponent.model_stl_url ??
    cadComponent.model_wrl_url
  )
}

function getPcbComponentsById(circuitJson: CircuitJson): Map<PcbComponentId, PcbComponentElement> {
  return new Map(
    circuitJson
      .filter((element): element is PcbComponentElement => element.type === "pcb_component")
      .map((pcbComponent) => [pcbComponent.pcb_component_id, pcbComponent]),
  )
}

function getEffectiveLayer({
  cadComponent,
  pcbComponentsById,
}: {
  cadComponent: CadComponentElement
  pcbComponentsById: Map<PcbComponentId, PcbComponentElement>
}): string | undefined {
  return (
    cadComponent.layer ??
    (cadComponent.pcb_component_id
      ? pcbComponentsById.get(cadComponent.pcb_component_id)?.layer
      : undefined)
  )
}

function getPositionErrorMm({
  firstPosition,
  secondPosition,
}: {
  firstPosition: CircuitPoint3
  secondPosition: CircuitPoint3
}): number {
  return Math.max(
    ...(["x", "y", "z"] as const).map((axis) =>
      Math.abs(firstPosition[axis] - secondPosition[axis]),
    ),
  )
}

function getRotationErrorDegrees({
  firstCcwRotationDegrees,
  secondCcwRotationDegrees,
}: {
  firstCcwRotationDegrees: number
  secondCcwRotationDegrees: number
}): number {
  const differenceDegrees = firstCcwRotationDegrees - secondCcwRotationDegrees
  return Math.abs(((((differenceDegrees + 180) % 360) + 360) % 360) - 180)
}

function expectCadModelPlacementsToMatch({
  generatedCircuitJson,
  sourceCircuitJson,
}: {
  generatedCircuitJson: CircuitJson
  sourceCircuitJson: CircuitJson
}): void {
  const generatedPcbComponentsById = getPcbComponentsById(generatedCircuitJson)
  const sourcePcbComponentsById = getPcbComponentsById(sourceCircuitJson)
  const generatedCadModels = generatedCircuitJson.filter(
    (element): element is CadComponentElement =>
      isCadComponentElement(element) && getCadModelUrl(element) !== undefined,
  )
  const unmatchedSourceCadModels = sourceCircuitJson.filter(
    (element): element is CadComponentElement =>
      isCadComponentElement(element) && getCadModelUrl(element) !== undefined,
  )
  expect(generatedCadModels.length).toBeGreaterThan(0)

  for (const generatedCadModel of generatedCadModels) {
    const generatedLayer = getEffectiveLayer({
      cadComponent: generatedCadModel,
      pcbComponentsById: generatedPcbComponentsById,
    })
    let closestSourceCadModelIndex = -1
    let closestPositionErrorMm = Number.POSITIVE_INFINITY
    for (const [sourceCadModelIndex, sourceCadModel] of unmatchedSourceCadModels.entries()) {
      if (
        getCadModelUrl(generatedCadModel) !== getCadModelUrl(sourceCadModel) ||
        getEffectiveLayer({
          cadComponent: sourceCadModel,
          pcbComponentsById: sourcePcbComponentsById,
        }) !== generatedLayer
      ) {
        continue
      }
      const positionErrorMm = getPositionErrorMm({
        firstPosition: generatedCadModel.position,
        secondPosition: sourceCadModel.position,
      })
      if (positionErrorMm < closestPositionErrorMm) {
        closestSourceCadModelIndex = sourceCadModelIndex
        closestPositionErrorMm = positionErrorMm
      }
    }

    expect(closestSourceCadModelIndex).toBeGreaterThanOrEqual(0)
    const [sourceCadModel] = unmatchedSourceCadModels.splice(closestSourceCadModelIndex, 1)
    if (!sourceCadModel) continue
    expect(closestPositionErrorMm).toBeLessThanOrEqual(MAX_POSITION_ERROR_MM)
    const sourceRotation = sourceCadModel.rotation ?? { x: 0, y: 0, z: 0 }
    const generatedRotation = generatedCadModel.rotation ?? {
      x: 0,
      y: 0,
      z: 0,
    }
    for (const axis of ["x", "y", "z"] as const) {
      expect(
        getRotationErrorDegrees({
          firstCcwRotationDegrees: generatedRotation[axis],
          secondCcwRotationDegrees: sourceRotation[axis],
        }),
      ).toBeLessThanOrEqual(MAX_ROTATION_ERROR_DEGREES)
    }
  }
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

  expectCadModelPlacementsToMatch({
    generatedCircuitJson,
    sourceCircuitJson,
  })

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
