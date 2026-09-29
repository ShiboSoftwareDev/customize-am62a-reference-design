import { expect, test } from "bun:test"
import { resolve } from "node:path"
import { parsePrebuiltCircuitJson } from "app/parse-prebuilt-circuit-json"

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
    "bq25731evm",
    "drv8210evm",
    "lmk1c1104evm",
    "tps62933pevm",
  ])
  expect(manifest.boards.map(({ artifacts }) => artifacts.length)).toEqual([5, 4, 4, 4, 4])
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

  const fullBoard = await loadPrebuiltArtifact(
    repositoryRoot,
    "full-evaluation-kit.circuit.json.gz",
  )
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
