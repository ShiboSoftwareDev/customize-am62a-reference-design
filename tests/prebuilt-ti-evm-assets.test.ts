import { expect, test } from "bun:test"
import { resolve } from "node:path"
import { parsePrebuiltCircuitJson } from "app/parse-prebuilt-circuit-json"

type PrebuiltManifest = {
  boards: Array<{
    id: string
    artifacts: Array<{ elementCount: number; output: string; source: string }>
  }>
  sources: Array<{ name: string; source: string; url: string }>
}

test("every prebuilt artifact is rendered from the parameterized SK-AM62A-LP TSX", async () => {
  const repositoryRoot = resolve(import.meta.dir, "..")
  const manifest = (await Bun.file(
    resolve(repositoryRoot, "public/prebuilt-ti-evms/manifest.json"),
  ).json()) as PrebuiltManifest

  expect(manifest.boards.map(({ id }) => id)).toEqual(["sk-am62a-lp"])
  expect(manifest.boards[0].artifacts).toHaveLength(5)
  expect(manifest.sources).toEqual([
    {
      name: "Texas Instruments SK-AM62A-LP",
      source: "lib/generated/am62a-board.tsx",
      url: "https://www.ti.com/tool/SK-AM62A-LP",
    },
  ])

  for (const artifact of manifest.boards[0].artifacts) {
    expect(artifact.source).toBe("Parameterized SK-AM62A-LP tscircuit TSX")
    const prebuiltFile = Bun.file(resolve(repositoryRoot, "public", artifact.output))
    expect(await prebuiltFile.exists()).toBe(true)
    expect(prebuiltFile.size).toBeGreaterThan(0)
    expect(artifact.elementCount).toBeGreaterThan(60_000)
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
