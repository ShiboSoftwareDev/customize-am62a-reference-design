import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import type { TiEvm, TiEvmVariant } from "../../lib/ti-evm-catalog"
import type { ManifestArtifact } from "./build-variant"

export async function runTiEvmVariantBuild({
  evm,
  variant,
}: {
  evm: TiEvm
  variant: TiEvmVariant
}): Promise<ManifestArtifact> {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "sitara-prebuild-"))
  const resultPath = join(temporaryDirectory, "artifact.json")
  try {
    const child = Bun.spawn(
      [
        process.execPath,
        resolve(import.meta.dir, "render-variant.ts"),
        evm.id,
        variant.id,
        resultPath,
      ],
      { cwd: resolve(import.meta.dir, "../.."), stdout: "inherit", stderr: "inherit" },
    )
    const exitCode = await child.exited
    if (exitCode !== 0)
      throw new Error(`${evm.name} ${variant.label} prebuild exited with ${exitCode}`)
    return JSON.parse(await readFile(resultPath, "utf8")) as ManifestArtifact
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true })
  }
}
