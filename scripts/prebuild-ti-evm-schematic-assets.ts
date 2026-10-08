import { mkdir, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import type { AnyCircuitElement } from "circuit-json"
import { gunzipSync, gzipSync, strFromU8, strToU8 } from "fflate"
import { filterReferenceSchematic } from "../lib/evms/filter-reference-schematic"
import { getReferenceSchematicComponentName } from "../lib/evms/get-reference-schematic-component-name"
import { getParameterizedTiEvmDefinition } from "../lib/evms/parameterized-ti-evms"
import { tiEvms } from "../lib/ti-evm-catalog"

export async function prebuildTiEvmSchematicAssets(): Promise<void> {
  let artifactCount = 0
  for (const evm of tiEvms) {
    const definition = getParameterizedTiEvmDefinition(evm.id)
    const referenceSchematics = await Promise.all(
      evm.schematicSheetLabels.map((_, schematicSheetIndex) =>
        readReferenceSchematic({
          evmId: evm.id,
          schematicSheetIndex,
        }),
      ),
    )

    for (const variant of evm.variants) {
      if (variant.schematicCircuitJsonUrls.length !== referenceSchematics.length) {
        throw new Error(`${evm.name} ${variant.label} has incomplete schematic artifact URLs`)
      }
      const removedComponentNames = new Set(
        definition.components.flatMap((component) =>
          component.removableFeatureId !== undefined &&
          variant.removedFeatureIds.includes(component.removableFeatureId)
            ? [getReferenceSchematicComponentName(component)]
            : [],
        ),
      )
      await Promise.all(
        referenceSchematics.map(async (referenceSchematic, schematicSheetIndex) => {
          const schematicCircuitJson = filterReferenceSchematic({
            circuitJson: referenceSchematic,
            removedComponentNames,
          })
          const outputPath = resolve(
            import.meta.dir,
            `../public/${variant.schematicCircuitJsonUrls[schematicSheetIndex].replace(
              /^\//u,
              "",
            )}`,
          )
          await mkdir(resolve(outputPath, ".."), { recursive: true })
          await writeFile(
            outputPath,
            gzipSync(strToU8(JSON.stringify(schematicCircuitJson)), { level: 9 }),
          )
          artifactCount += 1
        }),
      )
    }
  }
  console.log(`Prebuilt ${artifactCount} reference schematic variants`)
}

async function readReferenceSchematic(params: {
  evmId: string
  schematicSheetIndex: number
}): Promise<AnyCircuitElement[]> {
  const sheetSuffix = params.schematicSheetIndex === 0 ? "" : `-${params.schematicSheetIndex + 1}`
  const inputPath = resolve(
    import.meta.dir,
    `../lib/generated/ti-evms/${params.evmId}.schematic${sheetSuffix}.circuit.json.gz`,
  )
  const compressed = new Uint8Array(await Bun.file(inputPath).arrayBuffer())
  return JSON.parse(strFromU8(gunzipSync(compressed))) as AnyCircuitElement[]
}

if (import.meta.main) await prebuildTiEvmSchematicAssets()
