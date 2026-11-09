import { expect, test } from "bun:test"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { execFileSync } from "node:child_process"

test("BeaglePlay package retains all six populations, authored sheets and pinned source blobs", async () => {
  const directory = await mkdtemp(join(tmpdir(), "reference-package-"))
  try {
    execFileSync(
      process.execPath,
      ["scripts/export-registry-packages.ts", directory, "beagleplay"],
      { cwd: process.cwd() },
    )
    const root = join(directory, "beagleplay-reference-design")
    const definition = JSON.parse(await readFile(join(root, "reference-package.json"), "utf8"))
    expect(definition.sourceCommit).toBe(
      execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    )
    expect(
      definition.assets.filter((asset: any) => asset.output.endsWith("/circuit.json.gz")),
    ).toHaveLength(6)
    expect(definition.assets.filter((asset: any) => asset.output.endsWith("/3d.glb"))).toHaveLength(
      6,
    )
    expect(
      definition.assets.filter((asset: any) =>
        asset.output.startsWith("dist/full_board/schematic-"),
      ),
    ).toHaveLength(22)
    expect(
      definition.assets.filter((asset: any) =>
        asset.output.startsWith("dist/minimal_board/schematic-"),
      ),
    ).toHaveLength(15)
    for (const asset of definition.assets) {
      expect(asset.gitBlob).toBe(
        execFileSync("git", ["rev-parse", `${definition.sourceCommit}:${asset.path}`], {
          encoding: "utf8",
        }).trim(),
      )
      expect(asset.output.startsWith("dist/")).toBe(true)
    }
    const source = await readFile(join(root, "index.circuit.tsx"), "utf8")
    expect(source).toContain("export const propsSchema")
    expect(source).toContain("export const presets")
    expect(source).toContain('"minimal_board"')
    const config = JSON.parse(await readFile(join(root, "tscircuit.config.json"), "utf8"))
    expect(config.buildCommand).toBe("bun run build")
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
