import { createHash } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { gunzipSync } from "node:zlib"

type Asset = { path: string; output: string; gitBlob: string; elementCount?: number }
type Definition = { sourceCommit: string; repository: string; board: string; assets: Asset[] }

const definition: Definition = JSON.parse(await readFile("reference-package.json", "utf8"))
const downloads = new Map<string, Promise<Uint8Array>>()

function download(asset: Asset) {
  const existing = downloads.get(asset.path)
  if (existing) return existing
  const request = (async () => {
    const url = `https://raw.githubusercontent.com/${definition.repository}/${definition.sourceCommit}/${asset.path}`
    const response = await fetch(url)
    if (!response.ok) throw new Error(`${asset.path}: HTTP ${response.status}`)
    const bytes = new Uint8Array(await response.arrayBuffer())
    const digest = createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex")
    if (digest !== asset.gitBlob) throw new Error(`${asset.path}: source blob hash mismatch`)
    if (asset.output.endsWith(".json.gz")) {
      const circuit = JSON.parse(gunzipSync(bytes).toString())
      if (
        !Array.isArray(circuit) ||
        (asset.elementCount !== undefined && circuit.length !== asset.elementCount)
      )
        throw new Error(`${asset.path}: unexpected circuit contents`)
      if (
        asset.output.endsWith("/circuit.json.gz") &&
        !circuit.some((element: any) => element.type === "pcb_trace")
      )
        throw new Error(`${asset.path}: routed copper is missing`)
    }
    if (asset.output.endsWith("3d.glb") && Buffer.from(bytes).toString("ascii", 0, 4) !== "glTF")
      throw new Error(`${asset.path}: invalid GLB`)
    return bytes
  })()
  downloads.set(asset.path, request)
  return request
}

let nextAsset = 0
async function writeAssets() {
  while (nextAsset < definition.assets.length) {
    const asset = definition.assets[nextAsset++]
    const output = resolve(asset.output)
    if (!output.startsWith(`${resolve("dist")}/`))
      throw new Error("Asset output must be inside dist")
    const bytes = await download(asset)
    await mkdir(dirname(output), { recursive: true })
    await writeFile(output, bytes)
  }
}

await Promise.all(Array.from({ length: 3 }, writeAssets))
for (const format of ["esm", "cjs"] as const) {
  const result = await Bun.build({
    entrypoints: ["index.circuit.tsx"],
    outdir: "dist",
    naming: format === "esm" ? "index.js" : "index.cjs",
    target: "browser",
    format,
    external: ["react", "react/jsx-runtime", "tscircuit", "zod"],
  })
  if (!result.success) throw new AggregateError(result.logs, "Reference component bundling failed")
}
await writeFile(
  "dist/index.d.ts",
  'export { default, propsSchema, presets } from "../index.circuit"\n',
)
await writeFile(
  "dist/source-provenance.json",
  JSON.stringify(
    {
      repository: definition.repository,
      commit: definition.sourceCommit,
      board: definition.board,
      assets: definition.assets,
    },
    null,
    2,
  ),
)
console.log(`Built ${definition.board}: ${definition.assets.length} source-verified artifacts`)
