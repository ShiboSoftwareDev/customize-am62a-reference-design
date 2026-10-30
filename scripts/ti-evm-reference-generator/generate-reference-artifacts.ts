import { mkdir } from "node:fs/promises"
import { resolve } from "node:path"
import type { ReferenceEvmDefinition } from "../../lib/evms/reference-evm-types"
import { compressCircuitJson } from "./compress-circuit-json"
import { createReferenceDefinition } from "./create-reference-definition"
import { createParameterizedReferenceSource } from "./create-parameterized-reference-source"
import type { ReferenceInput } from "./types"

export async function generateReferenceArtifacts(params: {
  cadModelOutputDirectory: string
  outputDirectory: string
  reference: ReferenceInput
}): Promise<void> {
  const {
    definition,
    pcbDocument,
    embeddedCadModels,
    projectCircuitJson,
    referenceSchematicCircuitJsons,
    sourceFootprintByComponentName,
  } = await createReferenceDefinition(params.reference)
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
    resolve(params.outputDirectory, `${params.reference.id}.component-footprints.json`),
    `${JSON.stringify(Object.fromEntries(sourceFootprintByComponentName), null, 2)}\n`,
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

  const parameterizedBoard = createParameterizedReferenceSource({
    definition,
    pcbDocument,
    projectCircuitJson,
    reference: params.reference,
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
