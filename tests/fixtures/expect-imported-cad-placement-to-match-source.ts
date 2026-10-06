import { expect } from "bun:test"
import { resolve } from "node:path"
import type { AnyCircuitElement } from "circuit-json"
import { gunzipSync, strFromU8 } from "fflate"

type CadModelPlacementKey = string
type PcbComponentId = string
type SourceComponentId = string

type CadComponentElement = AnyCircuitElement & {
  type: "cad_component"
  cad_component_id: string
  layer?: string
  model_glb_url?: string
  model_origin_alignment?: string
  model_origin_position?: { x: number; y: number; z: number }
  pcb_component_id: PcbComponentId
  position: { x: number; y: number; z: number }
  rotation?: { x: number; y: number; z: number }
  source_component_id?: SourceComponentId
}

type NamedCadModelPlacement = {
  cadComponent: CadComponentElement
  componentName: string
}

export async function expectImportedCadPlacementToMatchSource(params: {
  evmId: string
}): Promise<void> {
  const repositoryRoot = resolve(import.meta.dir, "../..")
  const sourceCircuitJson = await readCompressedCircuitJson(
    resolve(repositoryRoot, "lib/generated/ti-evms", `${params.evmId}.source.circuit.json.gz`),
  )
  const renderedCircuitJson = await readCompressedCircuitJson(
    resolve(repositoryRoot, "public/prebuilt-ti-evms", params.evmId, "full-board.circuit.json.gz"),
  )
  const sourcePlacements = getNamedCadModelPlacements({
    circuitJson: sourceCircuitJson,
    modelUrlPrefix: `/cad-models/${params.evmId}/`,
  })
  const renderedPlacements = getNamedCadModelPlacements({
    circuitJson: renderedCircuitJson,
    modelUrlPrefix: `/cad-models/${params.evmId}/`,
  })

  expect(renderedPlacements.size).toBe(sourcePlacements.size)
  for (const [placementKey, expectedModels] of sourcePlacements) {
    const renderedModels = renderedPlacements.get(placementKey)
    expect(renderedModels?.length).toBe(expectedModels.length)
    if (!renderedModels) continue

    for (const [modelIndex, expectedModel] of expectedModels.entries()) {
      const renderedModel = renderedModels[modelIndex]
      expect(renderedModel).toBeDefined()
      if (!renderedModel) continue
      expectCadModelPlacementToMatch({
        expectedModel: expectedModel.cadComponent,
        renderedModel: renderedModel.cadComponent,
      })
    }
  }
}

function getNamedCadModelPlacements(params: {
  circuitJson: AnyCircuitElement[]
  modelUrlPrefix: string
}): Map<CadModelPlacementKey, NamedCadModelPlacement[]> {
  const componentNamesById = new Map<SourceComponentId, string>(
    params.circuitJson.flatMap((element) =>
      element.type === "source_component" &&
      typeof element.source_component_id === "string" &&
      typeof element.name === "string"
        ? [[element.source_component_id, element.name] as const]
        : [],
    ),
  )
  const sourceComponentIdsByPcbComponentId = new Map<PcbComponentId, SourceComponentId>(
    params.circuitJson.flatMap((element) =>
      element.type === "pcb_component" &&
      typeof element.pcb_component_id === "string" &&
      typeof element.source_component_id === "string"
        ? [[element.pcb_component_id, element.source_component_id] as const]
        : [],
    ),
  )
  const placementsByKey = new Map<CadModelPlacementKey, NamedCadModelPlacement[]>()

  for (const element of params.circuitJson) {
    if (!isCadComponent(element) || !element.model_glb_url?.startsWith(params.modelUrlPrefix)) {
      continue
    }
    const sourceComponentId =
      element.source_component_id ??
      sourceComponentIdsByPcbComponentId.get(element.pcb_component_id)
    const componentName = sourceComponentId ? componentNamesById.get(sourceComponentId) : undefined
    if (!componentName) {
      throw new Error(`${element.cad_component_id} has no source component name`)
    }
    const placementKey = `${componentName}:${element.model_glb_url}`
    const placements = placementsByKey.get(placementKey) ?? []
    placements.push({ cadComponent: element, componentName })
    placementsByKey.set(placementKey, placements)
  }

  for (const placements of placementsByKey.values()) {
    placements.sort((firstPlacement, secondPlacement) =>
      getPlacementSortKey(firstPlacement.cadComponent).localeCompare(
        getPlacementSortKey(secondPlacement.cadComponent),
      ),
    )
  }

  return placementsByKey
}

function expectCadModelPlacementToMatch(params: {
  expectedModel: CadComponentElement
  renderedModel: CadComponentElement
}): void {
  expect(params.renderedModel.layer).toBe(params.expectedModel.layer)
  expect(params.renderedModel.position.x).toBeCloseTo(params.expectedModel.position.x, 8)
  expect(params.renderedModel.position.y).toBeCloseTo(params.expectedModel.position.y, 8)
  expect(params.renderedModel.position.z).toBeCloseTo(params.expectedModel.position.z, 8)
  expect(normalizeDegrees(params.renderedModel.rotation?.x ?? 0)).toBeCloseTo(
    normalizeDegrees(params.expectedModel.rotation?.x ?? 0),
    8,
  )
  expect(normalizeDegrees(params.renderedModel.rotation?.y ?? 0)).toBeCloseTo(
    normalizeDegrees(params.expectedModel.rotation?.y ?? 0),
    8,
  )
  expect(normalizeDegrees(params.renderedModel.rotation?.z ?? 0)).toBeCloseTo(
    normalizeDegrees(params.expectedModel.rotation?.z ?? 0),
    8,
  )

  if (
    params.expectedModel.model_origin_alignment === "unknown" &&
    params.expectedModel.model_origin_position === undefined
  ) {
    expect(params.renderedModel.model_origin_position).toEqual({
      x: 0,
      y: 0,
      z: 0,
    })
  }
}

function getPlacementSortKey(cadComponent: CadComponentElement): string {
  return JSON.stringify({
    position: cadComponent.position,
    rotation: cadComponent.rotation,
  })
}

function normalizeDegrees(degrees: number): number {
  return ((degrees % 360) + 360) % 360
}

function isCadComponent(element: AnyCircuitElement): element is CadComponentElement {
  return (
    element.type === "cad_component" &&
    typeof element.cad_component_id === "string" &&
    typeof element.pcb_component_id === "string" &&
    typeof element.position === "object" &&
    element.position !== null
  )
}

async function readCompressedCircuitJson(path: string): Promise<AnyCircuitElement[]> {
  const compressed = new Uint8Array(await Bun.file(path).arrayBuffer())
  return JSON.parse(strFromU8(gunzipSync(compressed))) as AnyCircuitElement[]
}
