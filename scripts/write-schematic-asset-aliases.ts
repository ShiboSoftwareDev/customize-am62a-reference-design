import { createHash } from "node:crypto"
import { readFile, writeFile } from "node:fs/promises"
import { tiEvms, type SchematicCircuitJsonUrl } from "../lib/ti-evm-catalog"

type SchematicAssetHash = string

export async function writeSchematicAssetAliases(): Promise<void> {
  const schematicAssetAliases: Partial<Record<SchematicCircuitJsonUrl, SchematicCircuitJsonUrl>> =
    {}

  for (const evm of tiEvms) {
    for (const schematicSheetIndex of evm.schematicSheetLabels.keys()) {
      const schematicUrlByHash = new Map<SchematicAssetHash, SchematicCircuitJsonUrl>()
      for (const variant of evm.variants) {
        const schematicUrl = variant.schematicCircuitJsonUrls[schematicSheetIndex]
        const schematicAsset = await readFile(new URL(`../public${schematicUrl}`, import.meta.url))
        const hash = createHash("sha256").update(schematicAsset).digest("hex")
        const canonicalSchematicUrl = schematicUrlByHash.get(hash)
        if (canonicalSchematicUrl === undefined) {
          schematicUrlByHash.set(hash, schematicUrl)
        } else {
          schematicAssetAliases[schematicUrl] = canonicalSchematicUrl
        }
      }
    }
  }

  await writeFile(
    new URL("../lib/generated/ti-evms/schematic-asset-aliases.json", import.meta.url),
    `${JSON.stringify(schematicAssetAliases, null, 2)}\n`,
  )
}

if (import.meta.main) await writeSchematicAssetAliases()
