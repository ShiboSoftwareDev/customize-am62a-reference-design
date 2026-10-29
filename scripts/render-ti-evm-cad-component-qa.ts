import { mkdir, rm, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import type { AnyCircuitElement, CircuitJson } from "circuit-json"
import { gunzipSync, strFromU8 } from "fflate"
import { renderGLTFToPNGFromGLB } from "poppygl"
import { tiEvms } from "../lib/ti-evm-catalog"
import { getCadModelReplacement } from "./prebuild-ti-evm-cad-scenes/get-cad-model-replacement"
import {
  readSourceFootprints,
  type SourceFootprint,
} from "./prebuild-ti-evm-cad-scenes/read-source-footprints"

type SourceComponentId = string
type SourceComponent = AnyCircuitElement & {
  manufacturer_part_number?: string
  name: string
  source_component_id: SourceComponentId
  type: "source_component"
}
type PcbComponent = AnyCircuitElement & {
  center: { x: number; y: number }
  height: number
  layer: "bottom" | "top"
  source_component_id: SourceComponentId
  type: "pcb_component"
  width: number
}
type PcbBoard = AnyCircuitElement & {
  center: { x: number; y: number }
  type: "pcb_board"
}

const repositoryRoot = resolve(import.meta.dir, "..")
const outputRoot = resolve("/tmp/ti-evm-cad-component-qa")

await rm(outputRoot, { recursive: true, force: true })
await mkdir(outputRoot, { recursive: true })

for (const evm of tiEvms) {
  const fullBoard = evm.variants.find(({ id }) => id === "full-board")
  if (!fullBoard) throw new Error(`${evm.name} has no full-board variant`)

  const circuitJson = await readCompressedCircuitJson(fullBoard.circuitJsonUrl)
  const glb = await Bun.file(resolvePublicUrl(fullBoard.prebuiltCadSceneUrl)).arrayBuffer()
  const sourceFootprints = await readSourceFootprints(
    resolve(repositoryRoot, "lib/generated/ti-evms", `${evm.id}.component-footprints.json`),
  )
  const pcbBoard = circuitJson.find(isPcbBoard)
  if (!pcbBoard) throw new Error(`${evm.name} has no PCB board element`)
  const sourceComponentById = new Map<SourceComponentId, SourceComponent>(
    circuitJson.flatMap((element) =>
      isSourceComponent(element) ? [[element.source_component_id, element] as const] : [],
    ),
  )
  const seenPackageFootprints = new Set<SourceFootprint>()

  for (const pcbComponent of circuitJson) {
    if (!isPcbComponent(pcbComponent)) continue
    const sourceComponent = sourceComponentById.get(pcbComponent.source_component_id)
    if (!sourceComponent) continue
    const footprint = sourceFootprints.get(sourceComponent.name)
    if (!footprint) continue
    const replacement = getCadModelReplacement({
      altiumFootprint: footprint,
      componentName: sourceComponent.name,
      manufacturerPartNumber: sourceComponent.manufacturer_part_number,
    })
    if (!replacement || replacement.kind === "none") continue

    const isMechanicalComponent = /^(?:J|MOD|P|S|SW)/u.test(sourceComponent.name)
    const isLargePackage = Math.max(pcbComponent.width, pcbComponent.height) >= 5
    if (!isMechanicalComponent && (!isLargePackage || seenPackageFootprints.has(footprint))) {
      continue
    }
    seenPackageFootprints.add(footprint)

    const focusDistance = Math.max(12, Math.max(pcbComponent.width, pcbComponent.height) * 2.1)
    const boardNormalDirection = pcbComponent.layer === "bottom" ? -1 : 1
    const lookAt: [number, number, number] = [
      -pcbComponent.center.x,
      boardNormalDirection * 1.5,
      pcbComponent.center.y,
    ]
    const cameraPosition = getComponentCameraPosition({
      boardCenter: pcbBoard.center,
      boardNormalDirection,
      componentCenter: pcbComponent.center,
      focusDistance,
      isMechanicalComponent,
      lookAt,
    })
    const png = await renderGLTFToPNGFromGLB(glb, {
      backgroundColor: "#07100c",
      camPos: cameraPosition,
      fov: 40,
      height: 500,
      lookAt,
      supersampling: 1,
      up: "y+",
      width: 600,
    })
    const safeFootprint = footprint.replace(/[^a-zA-Z0-9_-]+/gu, "-").slice(0, 80)
    await writeFile(
      resolve(outputRoot, `${evm.id}-${sourceComponent.name}-${safeFootprint}.png`),
      png,
    )
  }
}

console.log(`Rendered component CAD QA views to ${outputRoot}`)

function isSourceComponent(element: AnyCircuitElement): element is SourceComponent {
  return (
    element.type === "source_component" &&
    typeof element.source_component_id === "string" &&
    typeof element.name === "string"
  )
}

function isPcbComponent(element: AnyCircuitElement): element is PcbComponent {
  return (
    element.type === "pcb_component" &&
    typeof element.source_component_id === "string" &&
    typeof element.width === "number" &&
    typeof element.height === "number" &&
    (element.layer === "top" || element.layer === "bottom") &&
    typeof element.center?.x === "number" &&
    typeof element.center?.y === "number"
  )
}

function isPcbBoard(element: AnyCircuitElement): element is PcbBoard {
  return (
    element.type === "pcb_board" &&
    typeof element.center?.x === "number" &&
    typeof element.center?.y === "number"
  )
}

function getComponentCameraPosition({
  boardCenter,
  boardNormalDirection,
  componentCenter,
  focusDistance,
  isMechanicalComponent,
  lookAt,
}: {
  boardCenter: { x: number; y: number }
  boardNormalDirection: number
  componentCenter: { x: number; y: number }
  focusDistance: number
  isMechanicalComponent: boolean
  lookAt: [number, number, number]
}): [number, number, number] {
  const boardEdgeDirection = {
    x: componentCenter.x - boardCenter.x,
    y: componentCenter.y - boardCenter.y,
  }
  const distanceFromBoardCenter = Math.hypot(boardEdgeDirection.x, boardEdgeDirection.y)

  if (isMechanicalComponent && distanceFromBoardCenter > 0) {
    return [
      lookAt[0] - (boardEdgeDirection.x / distanceFromBoardCenter) * focusDistance,
      lookAt[1] + boardNormalDirection * focusDistance * 0.35,
      lookAt[2] + (boardEdgeDirection.y / distanceFromBoardCenter) * focusDistance,
    ]
  }

  return [
    lookAt[0] - focusDistance * 0.75,
    lookAt[1] + boardNormalDirection * focusDistance * 0.65,
    lookAt[2] + focusDistance * 0.75,
  ]
}

async function readCompressedCircuitJson(publicUrl: string): Promise<CircuitJson> {
  const compressed = new Uint8Array(await Bun.file(resolvePublicUrl(publicUrl)).arrayBuffer())
  return JSON.parse(strFromU8(gunzipSync(compressed))) as CircuitJson
}

function resolvePublicUrl(publicUrl: string): string {
  return resolve(repositoryRoot, "public", publicUrl.replace(/^\//u, ""))
}
