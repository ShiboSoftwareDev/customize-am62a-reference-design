import { mkdir, writeFile } from "node:fs/promises"
import { basename, resolve } from "node:path"
import type { AnyCircuitElement } from "circuit-json"
import { gzipSync, strToU8 } from "fflate"
import { evaluateBoard, evaluateParameterizedTiEvm } from "../lib/server/evaluate-board"
import { skAm62aLp, tiEvms } from "../lib/ti-evm-catalog"

const outputDirectory = resolve(import.meta.dir, "../public/prebuilt-ti-evms")

type ManifestArtifact = {
  elementCount: number
  output: string
  pcbTraceCount: number
  source: string
  sourceComponentCount: number
  sourceTraceCount: number
}

export async function prebuildTiEvmAssets(): Promise<void> {
  await mkdir(outputDirectory, { recursive: true })
  const artifacts: ManifestArtifact[] = []

  for (const variant of skAm62aLp.variants) {
    if (!variant.sourceSelection) throw new Error(`${variant.label} has no AM62A selection`)
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

  const boards = [{ id: skAm62aLp.id, artifacts }]
  for (const evm of tiEvms.filter(({ id }) => id !== skAm62aLp.id)) {
    const evmArtifacts: ManifestArtifact[] = []
    for (const variant of evm.variants) {
      if (!variant.evmOptions) throw new Error(`${evm.name} ${variant.label} has no TSX options`)
      const result = await evaluateParameterizedTiEvm({
        evmId: evm.id,
        options: variant.evmOptions,
      })
      const failedComponents = result.circuitJson.filter(
        ({ type }) => type === "source_failed_to_create_component_error",
      )
      if (failedComponents.length > 0) {
        throw new Error(`${evm.name} ${variant.label} failed to render`)
      }
      const pcbTraceCount = result.circuitJson.filter(({ type }) => type === "pcb_trace").length
      if (pcbTraceCount === 0) {
        throw new Error(`${evm.name} ${variant.label} produced no routed PCB traces`)
      }
      evmArtifacts.push(
        await writeCompressedCircuitJson({
          outputPath: variant.circuitJsonUrl,
          circuitJson: result.circuitJson,
          source: `Parameterized ${evm.name} tscircuit TSX`,
        }),
      )
    }
    boards.push({ id: evm.id, artifacts: evmArtifacts })
  }

  const manifest = {
    boards,
    sources: [
      {
        name: "Texas Instruments SK-AM62A-LP",
        url: skAm62aLp.sourceUrl,
        source: "lib/generated/am62a-board.tsx",
      },
      ...tiEvms.slice(1).map((evm) => ({
        name: `Texas Instruments ${evm.name}`,
        url: evm.sourceUrl,
        source: "lib/evms/parameterized-ti-evms.tsx",
      })),
    ],
  }
  await writeFile(
    resolve(outputDirectory, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  )

  console.log(
    `Prebuilt ${boards.reduce((count, board) => count + board.artifacts.length, 0)} variants across ${boards.length} TI EVMs`,
  )
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
    pcbTraceCount: circuitJson.filter(({ type }) => type === "pcb_trace").length,
    source: artifact.source,
    sourceComponentCount: circuitJson.filter(({ type }) => type === "source_component").length,
    sourceTraceCount: circuitJson.filter(({ type }) => type === "source_trace").length,
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
