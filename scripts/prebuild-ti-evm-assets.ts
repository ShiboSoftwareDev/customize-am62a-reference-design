import { mkdir, writeFile } from "node:fs/promises"
import { basename, resolve } from "node:path"
import type { AnyCircuitElement } from "circuit-json"
import { gzipSync, strToU8 } from "fflate"
import { evaluateBoard } from "../lib/server/evaluate-board"
import { skAm62aLp } from "../lib/ti-evm-catalog"

const outputDirectory = resolve(import.meta.dir, "../public/prebuilt-ti-evms")

type ManifestArtifact = {
  elementCount: number
  output: string
  source: string
}

export async function prebuildTiEvmAssets(): Promise<void> {
  await mkdir(outputDirectory, { recursive: true })
  const artifacts: ManifestArtifact[] = []

  for (const variant of skAm62aLp.variants) {
    const result = await evaluateBoard({
      selection: variant.sourceSelection,
      addPours: false,
    })
    const failedComponents = result.circuitJson.filter(
      ({ type }) => type === "source_failed_to_create_component_error",
    )
    if (failedComponents.length > 0) {
      throw new Error(`${skAm62aLp.name} ${variant.label} failed to render`)
    }
    artifacts.push(
      await writeCompressedCircuitJson({
        outputPath: variant.circuitJsonUrl,
        circuitJson: result.circuitJson,
        source: "Parameterized SK-AM62A-LP tscircuit TSX",
      }),
    )
  }

  const manifest = {
    boards: [{ id: skAm62aLp.id, artifacts }],
    sources: [
      {
        name: "Texas Instruments SK-AM62A-LP",
        url: skAm62aLp.sourceUrl,
        source: "lib/generated/am62a-board.tsx",
      },
    ],
  }
  await writeFile(
    resolve(outputDirectory, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  )

  console.log(`Prebuilt ${artifacts.length} ${skAm62aLp.name} TSX variants`)
}

async function writeCompressedCircuitJson(artifact: {
  outputPath: string
  circuitJson: AnyCircuitElement[]
  source: string
}): Promise<ManifestArtifact> {
  const circuitJson = removeNullProperties(artifact.circuitJson)
  validateCoreOutput(circuitJson, artifact.source)
  const relativeOutputPath = artifact.outputPath.replace(/^\//u, "")
  const outputPath = resolve(import.meta.dir, `../public/${relativeOutputPath}`)
  await mkdir(resolve(outputPath, ".."), { recursive: true })
  await writeFile(outputPath, gzipSync(strToU8(JSON.stringify(circuitJson)), { level: 9 }))
  return {
    elementCount: circuitJson.length,
    output: relativeOutputPath,
    source: artifact.source,
  }
}

function validateCoreOutput(circuitJson: AnyCircuitElement[], source: string): void {
  // Core currently emits string pin references (for example, "pin35") in
  // schematic port arrangements while the published circuit-json schema still
  // accepts only numeric references. Preserve core's viewer-compatible output,
  // but still reject malformed elements here.
  for (const [index, element] of circuitJson.entries()) {
    if (typeof element !== "object" || element === null || typeof element.type !== "string") {
      throw new Error(`${basename(source)} produced a malformed element at ${index}`)
    }
  }
}

function removeNullProperties(circuitJson: AnyCircuitElement[]): AnyCircuitElement[] {
  return JSON.parse(
    JSON.stringify(circuitJson, (_key, property) => (property === null ? undefined : property)),
  ) as AnyCircuitElement[]
}
