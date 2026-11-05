import { readFile, rename, writeFile } from "node:fs/promises"
import { brotliCompressSync, constants, gunzipSync } from "node:zlib"

const pcbPaths = ["sk-am62/minimal-board", "tmds62levm/full-board"]

for (const pcbPath of pcbPaths) {
  const circuitJson = new URL(`../dist/prebuilt-ti-evms/${pcbPath}.circuit.json`, import.meta.url)
  const gzipPath = new URL(`${circuitJson.href}.gz`)
  const brotliPath = new URL(`${circuitJson.href}.br`)
  const compressed = brotliCompressSync(gunzipSync(await readFile(gzipPath)), {
    params: { [constants.BROTLI_PARAM_QUALITY]: 8 },
  })

  await writeFile(brotliPath, compressed)
  // Vercel resolves existing static files before rewrites.
  await rename(gzipPath, new URL(`${circuitJson.href}.fallback.gz`))
}
