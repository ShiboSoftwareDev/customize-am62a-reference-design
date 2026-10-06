import { mkdir, rm, writeFile } from "node:fs/promises"
import { basename, resolve } from "node:path"
import type { AnyCircuitElement } from "circuit-json"
import { gunzipSync, gzipSync, strFromU8, strToU8 } from "fflate"
import { evaluateParameterizedTiEvm } from "../lib/server/evaluate-board"
import { tiEvms } from "../lib/ti-evm-catalog"
import { materializeImportedCopperPours } from "./ti-evm-reference-generator/materialize-imported-copper-pours"

const outputDirectory = resolve(import.meta.dir, "../public/prebuilt-ti-evms")

type ManifestArtifact = {
  elementCount: number
  output: string
  pcbTraceCount: number
  source: string
  sourceComponentCount: number
  sourceTraceCount: number
  schematicOutputs?: string[]
}
type SourceNet = AnyCircuitElement & {
  type: "source_net"
  name: string
}
type SourceNetName = string

export async function prebuildTiEvmAssets(): Promise<void> {
  await rm(outputDirectory, { recursive: true, force: true })
  await mkdir(outputDirectory, { recursive: true })
  const boards: Array<{ id: string; artifacts: ManifestArtifact[] }> = []
  for (const evm of tiEvms) {
    const sourceCircuitJson = await loadGeneratedSourceCircuitJson(evm.id)
    const evmArtifacts: ManifestArtifact[] = []
    let sourceNetNamesToImport: ReadonlySet<SourceNetName> | undefined
    for (const variant of evm.variants) {
      const result = await evaluateParameterizedTiEvm({
        evmId: evm.id,
        options: variant.evmOptions,
        renderImportedCopperPours: false,
      })
      const failedComponents = result.circuitJson.filter(
        ({ type }) => type === "source_failed_to_create_component_error",
      )
      if (failedComponents.length > 0) {
        throw new Error(`${evm.name} ${variant.label} failed to render`)
      }
      const routingErrors = result.circuitJson.filter(({ type }) =>
        [
          "pcb_trace_error",
          "pcb_port_not_matched_error",
          "source_trace_not_connected_error",
        ].includes(type),
      )
      if (routingErrors.length > 0) {
        throw new Error(
          `${evm.name} ${variant.label} produced ${routingErrors.length} routing errors`,
        )
      }
      if (variant.id === "full-board") {
        sourceNetNamesToImport = getMissingSourceNetNames({
          renderedCircuitJson: result.circuitJson,
          sourceCircuitJson,
        })
      }
      if (!sourceNetNamesToImport) {
        throw new Error(`${evm.name} must declare its full-board variant first`)
      }
      const circuitJson = materializeImportedCopperPours({
        renderedCircuitJson: result.circuitJson,
        sourceCircuitJson,
        sourceNetNamesToImport,
      })
      const pcbTraceCount = circuitJson.filter(({ type }) => type === "pcb_trace").length
      if (pcbTraceCount === 0) {
        throw new Error(`${evm.name} ${variant.label} produced no routed PCB traces`)
      }
      const manifestArtifact = await writeCompressedCircuitJson({
        outputPath: variant.circuitJsonUrl,
        circuitJson,
        source: `Parameterized ${evm.name} tscircuit TSX`,
      })
      if (variant.schematicCircuitJsonUrls.length === 0) {
        throw new Error(`${evm.name} ${variant.label} has no schematic artifact URLs`)
      }
      manifestArtifact.schematicOutputs = variant.schematicCircuitJsonUrls.map((url) =>
        url.replace(/^\//u, ""),
      )
      evmArtifacts.push(manifestArtifact)
    }
    boards.push({ id: evm.id, artifacts: evmArtifacts })
    console.log(`Prebuilt ${evmArtifacts.length} ${evm.name} variants`)
  }

  const manifest = {
    boards,
    sources: [
      ...tiEvms.map((evm) => ({
        name: `Texas Instruments ${evm.name}`,
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
    `Prebuilt ${boards.reduce((count, board) => count + board.artifacts.length, 0)} variants across ${boards.length} TI EVMs`,
  )
}

async function loadGeneratedSourceCircuitJson(evmId: string): Promise<AnyCircuitElement[]> {
  const sourcePath = resolve(
    import.meta.dir,
    `../lib/generated/ti-evms/${evmId}.source.circuit.json.gz`,
  )
  const compressed = new Uint8Array(await Bun.file(sourcePath).arrayBuffer())
  return JSON.parse(strFromU8(gunzipSync(compressed))) as AnyCircuitElement[]
}

function getMissingSourceNetNames(params: {
  renderedCircuitJson: AnyCircuitElement[]
  sourceCircuitJson: AnyCircuitElement[]
}): ReadonlySet<SourceNetName> {
  const renderedSourceNetNames = new Set(
    params.renderedCircuitJson.filter(isSourceNet).map((sourceNet) => sourceNet.name),
  )
  return new Set(
    params.sourceCircuitJson
      .filter(isSourceNet)
      .map((sourceNet) => sourceNet.name)
      .filter((sourceNetName) => !renderedSourceNetNames.has(sourceNetName)),
  )
}

function isSourceNet(element: AnyCircuitElement): element is SourceNet {
  return element.type === "source_net"
}

async function writeCompressedCircuitJson(artifact: {
  outputPath: string
  circuitJson: AnyCircuitElement[]
  source: string
}): Promise<ManifestArtifact> {
  const circuitJson = removeNullProperties(artifact.circuitJson)
  validateCoreOutput(circuitJson, artifact.source)
  const relativeOutputPath = await writeCompressedCircuitJsonFile({
    outputPath: artifact.outputPath,
    circuitJson,
  })
  return {
    elementCount: circuitJson.length,
    output: relativeOutputPath,
    pcbTraceCount: circuitJson.filter(({ type }) => type === "pcb_trace").length,
    source: artifact.source,
    sourceComponentCount: circuitJson.filter(({ type }) => type === "source_component").length,
    sourceTraceCount: circuitJson.filter(({ type }) => type === "source_trace").length,
  }
}

async function writeCompressedCircuitJsonFile(artifact: {
  outputPath: string
  circuitJson: AnyCircuitElement[]
}): Promise<string> {
  const relativeOutputPath = artifact.outputPath.replace(/^\//u, "")
  const outputPath = resolve(import.meta.dir, `../public/${relativeOutputPath}`)
  await mkdir(resolve(outputPath, ".."), { recursive: true })
  await writeFile(
    outputPath,
    gzipSync(strToU8(JSON.stringify(removeNullProperties(artifact.circuitJson))), { level: 9 }),
  )
  return relativeOutputPath
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
