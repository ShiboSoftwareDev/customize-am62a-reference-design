import { mkdir, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import type { AnyCircuitElement } from "circuit-json"
import { gunzipSync, gzipSync, strFromU8, strToU8 } from "fflate"
import { filterReferenceSchematic } from "../lib/evms/filter-reference-schematic"
import { getParameterizedTiEvmDefinition } from "../lib/evms/parameterized-ti-evms"
import { tiEvms } from "../lib/ti-evm-catalog"

export async function prebuildTiEvmSchematicAssets(): Promise<void> {
  let artifactCount = 0
  for (const evm of tiEvms) {
    if (evm.id === "sk-am62a-lp") continue
    const definition = getParameterizedTiEvmDefinition(evm.id)
    const referenceSchematic = await readReferenceSchematic(evm.id)

    for (const variant of evm.variants) {
      if (!variant.schematicCircuitJsonUrl) {
        throw new Error(`${evm.name} ${variant.label} has no schematic artifact URL`)
      }
      const removedComponentNames = new Set(
        definition.components.flatMap((component) =>
          component.removableFeatureId !== undefined &&
          variant.removedFeatureIds.includes(component.removableFeatureId)
            ? [component.name]
            : [],
        ),
      )
      const schematicCircuitJson = filterReferenceSchematic({
        circuitJson: referenceSchematic,
        removedComponentNames,
      })
      const outputPath = resolve(
        import.meta.dir,
        `../public/${variant.schematicCircuitJsonUrl.replace(/^\//u, "")}`,
      )
      await mkdir(resolve(outputPath, ".."), { recursive: true })
      await writeFile(
        outputPath,
        gzipSync(strToU8(JSON.stringify(schematicCircuitJson)), { level: 9 }),
      )
      artifactCount += 1
    }
  }
  console.log(`Prebuilt ${artifactCount} reference schematic variants`)
}

async function readReferenceSchematic(evmId: string): Promise<AnyCircuitElement[]> {
  const inputPath = resolve(
    import.meta.dir,
    `../lib/generated/ti-evms/${evmId}.schematic.circuit.json.gz`,
  )
  const compressed = new Uint8Array(await Bun.file(inputPath).arrayBuffer())
  return JSON.parse(strFromU8(gunzipSync(compressed))) as AnyCircuitElement[]
}

if (import.meta.main) await prebuildTiEvmSchematicAssets()
