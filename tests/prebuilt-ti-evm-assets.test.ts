import { expect, test } from "bun:test"
import { resolve } from "node:path"
import { parsePrebuiltCircuitJson } from "app/parse-prebuilt-circuit-json"
import { getParameterizedTiEvmDefinition } from "lib/evms/parameterized-ti-evms"
import { tiEvms } from "lib/ti-evm-catalog"

type PrebuiltManifest = {
  boards: Array<{
    id: string
    artifacts: Array<{
      elementCount: number
      output: string
      pcbTraceCount: number
      source: string
      sourceComponentCount: number
      sourceTraceCount: number
      schematicOutputs?: string[]
    }>
  }>
  sources: Array<{ name: string; source: string; url: string }>
}

test("every catalog board has prebuilt output from parameterized TSX", async () => {
  const repositoryRoot = resolve(import.meta.dir, "..")
  const manifest = (await Bun.file(
    resolve(repositoryRoot, "public/prebuilt-ti-evms/manifest.json"),
  ).json()) as PrebuiltManifest

  expect(manifest.boards.map(({ id }) => id)).toEqual([
    "sk-am62a-lp",
    "drv8307evm",
    "lm5155evm-fly",
    "lm251772evm-pd",
    "lmg342x-bb-evm",
  ])
  expect(manifest.boards.map(({ artifacts }) => artifacts.length)).toEqual([8, 4, 4, 4, 4])
  expect(manifest.sources).toHaveLength(5)

  for (const board of manifest.boards) {
    for (const artifact of board.artifacts) {
      expect(artifact.source).toContain("Parameterized")
      const prebuiltFile = Bun.file(resolve(repositoryRoot, "public", artifact.output))
      expect(await prebuiltFile.exists()).toBe(true)
      expect(prebuiltFile.size).toBeGreaterThan(0)
      expect(artifact.elementCount).toBeGreaterThan(100)
      expect(artifact.sourceComponentCount).toBeGreaterThan(0)
      expect(artifact.sourceTraceCount).toBeGreaterThan(0)
      expect(artifact.pcbTraceCount).toBeGreaterThan(0)
    }
  }

  for (const evm of tiEvms) {
    if (evm.id === "sk-am62a-lp") continue
    const definition = getParameterizedTiEvmDefinition(evm.id)
    for (const variant of evm.variants) {
      const removedComponentNames = new Set(
        definition.components.flatMap((component) =>
          component.removableFeatureId !== undefined &&
          variant.removedFeatureIds.includes(component.removableFeatureId)
            ? [component.name]
            : [],
        ),
      )
      const schematics = await Promise.all(
        variant.schematicCircuitJsonUrls.map((url) =>
          loadCompressedCircuitJson(repositoryRoot, url),
        ),
      )
      expect(
        schematics.reduce(
          (count, schematic) =>
            count + schematic.filter(({ type }) => type === "schematic_component").length,
          0,
        ),
      ).toBeGreaterThan(10)
      const renderedComponentNames = new Set(
        schematics.flatMap((schematic) =>
          schematic.flatMap((element) =>
            element.type === "source_component" && typeof element.name === "string"
              ? [element.name]
              : [],
          ),
        ),
      )
      for (const componentName of removedComponentNames) {
        expect(renderedComponentNames.has(componentName)).toBe(false)
      }
    }
  }

  const fullBoard = await loadPrebuiltArtifact(repositoryRoot, "full-board.circuit.json.gz")
  const board = fullBoard.find(({ type }) => type === "pcb_board")
  if (!board || board.type !== "pcb_board") throw new Error("Full TSX render has no PCB board")
  expect(board.num_layers).toBe(12)
  expect(board.width).toBeCloseTo(84.99983, 5)
  expect(board.height).toBeCloseTo(150.096728, 5)
  expect(fullBoard.filter(({ type }) => type === "source_component")).toHaveLength(1482)
  expect(fullBoard.filter(({ type }) => type === "source_trace")).toHaveLength(5137)
  expect(fullBoard.filter(({ type }) => type === "pcb_trace")).toHaveLength(5009)
  expect(fullBoard.filter(({ type }) => type === "pcb_via")).toHaveLength(3392)
})

async function loadPrebuiltArtifact(repositoryRoot: string, fileName: string) {
  const path = resolve(repositoryRoot, "public/prebuilt-ti-evms/sk-am62a-lp", fileName)
  return parsePrebuiltCircuitJson(new Uint8Array(await Bun.file(path).arrayBuffer()))
}

async function loadCompressedCircuitJson(repositoryRoot: string, publicUrl: string) {
  const path = resolve(repositoryRoot, "public", publicUrl.replace(/^\//u, ""))
  return parsePrebuiltCircuitJson(new Uint8Array(await Bun.file(path).arrayBuffer()))
}
