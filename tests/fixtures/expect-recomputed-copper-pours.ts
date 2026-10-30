import { expect } from "bun:test"
import { resolve } from "node:path"
import { isPointInsidePolygon } from "@tscircuit/math-utils"
import type { AnyCircuitElement } from "circuit-json"
import { parsePrebuiltCircuitJson } from "../../app/parse-prebuilt-circuit-json"
import { getTiEvm, type TiEvmId } from "../../lib/ti-evm-catalog"
import { expectMinimalBoardCopperSnapshots } from "./expect-minimal-board-copper-snapshots"

type Point = { x: number; y: number }
type SourceNetId = string
type PcbComponentId = string
type PcbPadLayerKey = string
type SourceComponentId = string
type SourceComponentName = string
type LayerName = string
type SolvedCopperPour = AnyCircuitElement & {
  type: "pcb_copper_pour"
  layer: LayerName
  shape: "brep" | "polygon"
  points?: Point[]
  source_net_id: SourceNetId
  brep_shape?: { outer_ring: { vertices: Point[] }; inner_rings?: Array<{ vertices: Point[] }> }
}

export async function expectRecomputedCopperPours({
  evmId,
  testPath,
}: {
  evmId: TiEvmId
  testPath: string
}): Promise<void> {
  const evm = getTiEvm(evmId)
  const fullBoard = await readCircuitJson(`/prebuilt-ti-evms/${evmId}/full-board.circuit.json.gz`)
  const fullBoardGroundPours = getGroundPours(fullBoard)
  const fullBoardGroundContainsPad = new Map<PcbPadLayerKey, boolean>()
  const sourceComponentNames = new Map<SourceComponentId, SourceComponentName>(
    fullBoard.flatMap((element) =>
      element.type === "source_component" &&
      typeof element.name === "string" &&
      typeof element.source_component_id === "string"
        ? [[element.source_component_id, element.name] as const]
        : [],
    ),
  )
  const componentNamesByPcbComponentId = new Map<PcbComponentId, SourceComponentName>()
  for (const element of fullBoard) {
    if (
      element.type !== "pcb_component" ||
      typeof element.source_component_id !== "string" ||
      typeof element.pcb_component_id !== "string"
    )
      continue
    const componentName = sourceComponentNames.get(element.source_component_id)
    if (componentName) componentNamesByPcbComponentId.set(element.pcb_component_id, componentName)
  }
  let totalRefilledPadCount = 0
  for (const variant of evm.variants) {
    const circuitJson = await readCircuitJson(variant.circuitJsonUrl)
    const pours = circuitJson.filter((element) => element.type === "pcb_copper_pour")
    expect(pours.length, `${evmId}/${variant.id}: no copper`).toBeGreaterThan(0)
    expect(
      pours.every((pour) => pour.shape === "brep" || pour.shape === "polygon"),
      `${evmId}/${variant.id}: unsupported copper geometry`,
    ).toBe(true)
    const board = circuitJson.find((element) => element.type === "pcb_board")
    if (!board || typeof board.num_layers !== "number")
      throw new Error(`${evmId}: no board layer stack`)
    expect(
      new Set(pours.map((pour) => pour.layer)).size,
      `${evmId}/${variant.id}: layer missing copper`,
    ).toBe(board.num_layers)
    if (variant.id === "full-board") continue

    const remainingComponentNames = new Set(
      circuitJson.flatMap((element) =>
        element.type === "source_component" && typeof element.name === "string"
          ? [element.name]
          : [],
      ),
    )
    const groundPours = getGroundPours(circuitJson)
    let refilledPadCount = 0
    for (const element of fullBoard) {
      if (
        !["pcb_smtpad", "pcb_plated_hole"].includes(element.type) ||
        typeof element.pcb_component_id !== "string" ||
        typeof element.x !== "number" ||
        typeof element.y !== "number"
      )
        continue
      const componentName = componentNamesByPcbComponentId.get(element.pcb_component_id)
      if (!componentName || remainingComponentNames.has(componentName)) continue
      const point = { x: element.x, y: element.y }
      let padId = element.pcb_smtpad_id
      let layers = [element.layer]
      if (element.type === "pcb_plated_hole") {
        padId = element.pcb_plated_hole_id
        layers = Array.isArray(element.layers) ? element.layers : []
      }
      for (const layer of layers) {
        if (typeof layer !== "string" || typeof padId !== "string") continue
        const padLayerKey = `${padId}/${layer}`
        let alreadyInGround = fullBoardGroundContainsPad.get(padLayerKey)
        if (alreadyInGround === undefined) {
          alreadyInGround = fullBoardGroundPours.some(
            (pour) => pour.layer === layer && isPointInPour(point, pour),
          )
          fullBoardGroundContainsPad.set(padLayerKey, alreadyInGround)
        }
        if (alreadyInGround) continue
        if (groundPours.some((pour) => pour.layer === layer && isPointInPour(point, pour)))
          refilledPadCount++
      }
    }
    totalRefilledPadCount += refilledPadCount
    if (variant.id === "minimal-board") {
      expect(
        pours.some((pour) => pour.shape === "brep"),
        `${evmId}: no computed expansion`,
      ).toBe(true)
      await expectMinimalBoardCopperSnapshots({ circuitJson, testPath })
    }
  }
  // Some features, such as BeagleBone's top-side eMMC, have no authored ground
  // polygon beneath them. Removing those pads must not create a new pour area.
  expect(totalRefilledPadCount, `${evmId}: no removed pad void was refilled`).toBeGreaterThan(0)
}

async function readCircuitJson(publicUrl: string): Promise<AnyCircuitElement[]> {
  const path = resolve(import.meta.dir, "../../public", publicUrl.replace(/^\//u, ""))
  return parsePrebuiltCircuitJson(new Uint8Array(await Bun.file(path).arrayBuffer()))
}

function getGroundPours(circuitJson: AnyCircuitElement[]): SolvedCopperPour[] {
  const groundNetIds = new Set<SourceNetId>(
    circuitJson.flatMap((element) =>
      element.type === "source_net" &&
      typeof element.source_net_id === "string" &&
      ["DGND", "GND"].includes(String(element.name))
        ? [element.source_net_id]
        : [],
    ),
  )
  return circuitJson.filter(
    (element): element is SolvedCopperPour =>
      element.type === "pcb_copper_pour" &&
      (element.shape === "brep" || element.shape === "polygon") &&
      typeof element.source_net_id === "string" &&
      groundNetIds.has(element.source_net_id),
  )
}

function isPointInPour(point: Point, pour: SolvedCopperPour): boolean {
  if (pour.shape === "polygon") return isPointInsidePolygon(point, pour.points ?? [])
  const boundary = pour.brep_shape
  if (!boundary) throw new Error("Computed copper has no boundary")
  return (
    isPointInsidePolygon(point, boundary.outer_ring.vertices) &&
    !(boundary.inner_rings ?? []).some((ring) => isPointInsidePolygon(point, ring.vertices))
  )
}
