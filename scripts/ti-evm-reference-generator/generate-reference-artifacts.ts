import { mkdir } from "node:fs/promises"
import { resolve } from "node:path"
import { convertCircuitJsonToTscircuit } from "circuit-json-to-tscircuit"
import { parameterizeGeneratedBoard } from "../parameterize-generated-board"
import type { ReferenceEvmDefinition } from "../../lib/evms/reference-evm-types"
import { compressCircuitJson } from "./compress-circuit-json"
import { createReferenceDefinition } from "./create-reference-definition"
import { getSupportedCopperPours } from "./get-supported-copper-pours"
import { getImportedRoutingMetadata } from "./get-imported-routing-metadata"
import {
  getRoutablePortSelectors,
  prepareConverterCircuitJson,
} from "./prepare-converter-circuit-json"
import type { ComponentName, FeatureId, ReferenceInput } from "./types"

export async function generateReferenceArtifacts(params: {
  cadModelOutputDirectory: string
  outputDirectory: string
  reference: ReferenceInput
}): Promise<void> {
  const { definition, embeddedCadModels, projectCircuitJson, referenceSchematicCircuitJsons } =
    await createReferenceDefinition(params.reference)
  const cadModelBoardDirectory = resolve(params.cadModelOutputDirectory, params.reference.id)
  await mkdir(cadModelBoardDirectory, { recursive: true })

  await Bun.write(
    resolve(params.outputDirectory, params.reference.outputName),
    createDefinitionModuleSource({
      definition,
      exportName: params.reference.exportName,
    }),
  )
  await Bun.write(
    resolve(params.outputDirectory, `${params.reference.id}.source.circuit.json.gz`),
    compressCircuitJson(projectCircuitJson),
  )
  await Promise.all(
    embeddedCadModels.map(({ bytes, modelIndex }) =>
      Bun.write(resolve(cadModelBoardDirectory, `${modelIndex}.step`), bytes),
    ),
  )

  const featureIdByComponentName = new Map<ComponentName, FeatureId>(
    definition.components.flatMap((component) => {
      if (!component.removableFeatureId) return []
      return [[component.schematicName ?? component.name, component.removableFeatureId] as const]
    }),
  )
  const converterCircuitJson = prepareConverterCircuitJson(projectCircuitJson)
  const importedRoutingMetadata = getImportedRoutingMetadata({
    circuitJson: converterCircuitJson,
    featureIdByComponentName,
    removedFeatureIdCombinations: params.reference.removedFeatureIdCombinations,
  })
  const generatedSource = convertCircuitJsonToTscircuit(converterCircuitJson, {
    componentName: params.reference.componentName,
  })
  const parameterizedBoard = parameterizeGeneratedBoard({
    componentName: params.reference.componentName,
    featureIdByComponentName,
    generatedSource,
    importedRoutingMetadata,
    routablePortSelectors: getRoutablePortSelectors(converterCircuitJson),
    supportedCopperPours: getSupportedCopperPours({
      circuitJson: projectCircuitJson,
    }),
    teardropPortSelectors: new Set(
      definition.nets.flatMap((net) =>
        (net.teardropEndpoints ?? []).map(
          ({ componentName, pinKey }) => `.${componentName} > .${pinKey}`,
        ),
      ),
    ),
    viaTeardropPortSelectors: new Set(
      definition.nets.flatMap((net) =>
        net.hasViaTeardrops
          ? net.endpoints.map(({ componentName, pinKey }) => `.${componentName} > .${pinKey}`)
          : [],
      ),
    ),
  })

  await Bun.write(
    resolve(params.outputDirectory, `${params.reference.id}.circuit.tsx`),
    [
      "// @ts-nocheck",
      "// Generated through Altium -> Circuit JSON -> tscircuit.",
      "// Validated by render, fidelity, electrical, and snapshot tests; do not edit by hand.",
      parameterizedBoard.source,
    ].join("\n"),
  )
  await Promise.all(
    referenceSchematicCircuitJsons.map((schematicCircuitJson, schematicSheetIndex) =>
      Bun.write(
        resolve(
          params.outputDirectory,
          getReferenceSchematicFileName({
            referenceId: params.reference.id,
            schematicSheetIndex,
          }),
        ),
        compressCircuitJson(schematicCircuitJson),
      ),
    ),
  )

  console.log(
    `${params.reference.name}: ${parameterizedBoard.componentNames.length} generated TSX components, ${definition.nets.length} routable nets`,
  )
}

export function createDefinitionModuleSource(params: {
  definition: ReferenceEvmDefinition
  exportName: string
}): string {
  return [
    'import { parseReferenceEvmDefinition } from "../../evms/parse-reference-evm-definition"',
    "",
    "// Generated from checksum-pinned source design files.",
    "// Run scripts/generate-ti-evm-reference-definitions.ts to regenerate.",
    `export const ${params.exportName} = parseReferenceEvmDefinition(${JSON.stringify(JSON.stringify(params.definition))})`,
    "",
  ].join("\n")
}

function getReferenceSchematicFileName(params: {
  referenceId: string
  schematicSheetIndex: number
}): string {
  return params.schematicSheetIndex === 0
    ? `${params.referenceId}.schematic.circuit.json.gz`
    : `${params.referenceId}.schematic-${params.schematicSheetIndex + 1}.circuit.json.gz`
}
