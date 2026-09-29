import { expect, test } from "bun:test"
import { resolve } from "node:path"
import { parsePrebuiltCircuitJson } from "app/parse-prebuilt-circuit-json"

type PrebuiltManifest = {
  boards: Array<{
    id: string
    artifacts: Array<{ elementCount: number; output: string; source: string }>
  }>
  sources: Array<{ name: string; sha256: string; url: string }>
}

test("every catalog artifact is checked in with pinned TI source provenance", async () => {
  const repositoryRoot = resolve(import.meta.dir, "..")
  const manifest = (await Bun.file(
    resolve(repositoryRoot, "public/prebuilt-ti-evms/manifest.json"),
  ).json()) as PrebuiltManifest

  expect(manifest.boards.map(({ id }) => id)).toEqual([
    "sk-am62a-lp",
    "tmds62levm",
    "am62l-evse-dev-evm",
  ])
  expect(manifest.boards.flatMap(({ artifacts }) => artifacts)).toHaveLength(80)
  expect(manifest.sources).toHaveLength(2)
  expect(manifest.sources.every(({ sha256 }) => /^[a-f0-9]{64}$/u.test(sha256))).toBe(true)
  expect(manifest.boards[1].artifacts[0].elementCount).toBeGreaterThan(50_000)
  expect(manifest.boards[2].artifacts[0].elementCount).toBeGreaterThan(20_000)

  for (const artifact of manifest.boards.flatMap(({ artifacts }) => artifacts)) {
    const prebuiltFile = Bun.file(resolve(repositoryRoot, "public", artifact.output))
    expect(await prebuiltFile.exists()).toBe(true)
    expect(prebuiltFile.size).toBeGreaterThan(0)
    expect(artifact.elementCount).toBeGreaterThan(0)
  }

  const evsePcbPath = resolve(
    repositoryRoot,
    "public/prebuilt-ti-evms/am62l-evse-dev-evm/pcb.circuit.json.gz",
  )
  const evsePcb = parsePrebuiltCircuitJson(
    new Uint8Array(await Bun.file(evsePcbPath).arrayBuffer()),
  )
  const pcbBoard = evsePcb.find(({ type }) => type === "pcb_board")
  if (!pcbBoard) throw new Error("EVSE prebuilt artifact has no PCB board")
  const boardCenter = pcbBoard.center as { x: number; y: number }
  const halfWidth = (pcbBoard.width as number) / 2
  const halfHeight = (pcbBoard.height as number) / 2
  const hasOffBoardComponentBounds = evsePcb.some((element) => {
    if (element.type !== "pcb_component") return false
    const componentCenter = element.center as { x: number; y: number }
    return (
      componentCenter.x < boardCenter.x - halfWidth ||
      componentCenter.x > boardCenter.x + halfWidth ||
      componentCenter.y < boardCenter.y - halfHeight ||
      componentCenter.y > boardCenter.y + halfHeight
    )
  })
  expect(hasOffBoardComponentBounds).toBe(false)
})
