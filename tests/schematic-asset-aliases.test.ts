import { expect, test } from "bun:test"
import { readFile } from "node:fs/promises"
import schematicAssetAliases from "lib/generated/ti-evms/schematic-asset-aliases.json"

test("each shared schematic asset is byte-for-byte identical to its variant sheet", async () => {
  const aliases = Object.entries(schematicAssetAliases)
  expect(aliases.length).toBeGreaterThan(0)
  for (const [variantUrl, sharedUrl] of aliases) {
    const [variantAsset, sharedAsset] = await Promise.all([
      readFile(new URL(`../public${variantUrl}`, import.meta.url)),
      readFile(new URL(`../public${sharedUrl}`, import.meta.url)),
    ])
    expect(variantAsset.equals(sharedAsset), variantUrl).toBe(true)
  }
})
