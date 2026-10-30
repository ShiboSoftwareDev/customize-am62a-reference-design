import { mkdir, rm, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { tiEvms } from "../lib/ti-evm-catalog"
import type { ManifestArtifact } from "./prebuild-ti-evm-assets/build-variant"
import { runTiEvmVariantBuild } from "./prebuild-ti-evm-assets/run-variant-build"

const outputDirectory = resolve(import.meta.dir, "../public/prebuilt-ti-evms")

export async function prebuildTiEvmAssets(): Promise<void> {
  await rm(outputDirectory, { recursive: true, force: true })
  await mkdir(outputDirectory, { recursive: true })
  const boards: Array<{ id: string; artifacts: ManifestArtifact[] }> = []
  for (const evm of tiEvms) {
    const evmArtifacts: ManifestArtifact[] = []
    for (const variant of evm.variants) {
      evmArtifacts.push(await runTiEvmVariantBuild({ evm, variant }))
    }
    boards.push({ id: evm.id, artifacts: evmArtifacts })
    console.log(`Prebuilt ${evmArtifacts.length} ${evm.name} variants`)
  }

  const manifest = {
    boards,
    sources: [
      ...tiEvms.map((evm) => ({
        name: evm.name,
        url: evm.sourceUrl,
        source: evm.sourcePath,
      })),
    ],
  }
  await writeFile(
    resolve(outputDirectory, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  )

  console.log(
    `Prebuilt ${boards.reduce((count, board) => count + board.artifacts.length, 0)} variants across ${boards.length} Sitara boards`,
  )
}
