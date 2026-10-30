import { mkdir, writeFile } from "node:fs/promises"
import { basename, resolve } from "node:path"
import type { AnyCircuitElement } from "circuit-json"
import { gzipSync, strToU8 } from "fflate"
import { evaluateParameterizedTiEvm } from "../../lib/server/evaluate-board"
import type { TiEvm, TiEvmVariant } from "../../lib/ti-evm-catalog"
import { getConvertedCircuitIntegrityErrors } from "../get-converted-circuit-integrity-errors"

export type ManifestArtifact = {
  elementCount: number
  output: string
  pcbTraceCount: number
  source: string
  sourceComponentCount: number
  sourceTraceCount: number
  schematicOutputs?: string[]
}

export async function buildTiEvmVariantArtifact(params: {
  evm: TiEvm
  variant: TiEvmVariant
}): Promise<ManifestArtifact> {
  const result = await evaluateParameterizedTiEvm({
    evmId: params.evm.id,
    options: params.variant.evmOptions,
  })
  const failedComponents = result.circuitJson.filter(
    ({ type }) => type === "source_failed_to_create_component_error",
  )
  if (failedComponents.length > 0) {
    throw new Error(`${params.evm.name} ${params.variant.label} failed to render`)
  }
  const circuitJson = result.circuitJson
  const integrityErrors = getConvertedCircuitIntegrityErrors(circuitJson)
  if (integrityErrors.length > 0) {
    throw new Error(
      `${params.evm.name} ${params.variant.label} failed converted-circuit integrity checks:\n${integrityErrors.join("\n")}`,
    )
  }
  const pcbTraceCount = circuitJson.filter(({ type }) => type === "pcb_trace").length
  if (!circuitJson.some(({ type }) => type === "pcb_copper_pour")) {
    throw new Error(`${params.evm.name} ${params.variant.label} produced no computed copper pours`)
  }
  if (pcbTraceCount === 0) {
    throw new Error(`${params.evm.name} ${params.variant.label} produced no routed PCB traces`)
  }
  const manifestArtifact = await writeCompressedCircuitJson({
    outputPath: params.variant.circuitJsonUrl,
    circuitJson,
    source: `Parameterized ${params.evm.name} tscircuit TSX`,
  })
  if (params.variant.schematicCircuitJsonUrls.length === 0) {
    throw new Error(`${params.evm.name} ${params.variant.label} has no schematic artifact URLs`)
  }
  manifestArtifact.schematicOutputs = params.variant.schematicCircuitJsonUrls.map((url) =>
    url.replace(/^\//u, ""),
  )
  return manifestArtifact
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
  const outputPath = resolve(import.meta.dir, `../../public/${relativeOutputPath}`)
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
