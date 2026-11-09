import { execFileSync } from "node:child_process"
import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises"
import { resolve } from "node:path"
import { tiEvms, getTiEvmVariantSchematicCircuitJsonUrls } from "../lib/ti-evm-catalog"

const repository = "ShiboSoftwareDev/customize-am62a-reference-design"
const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim()
const outputRoot = resolve(process.argv[2] || "dist/registry-packages")
const requestedBoards = process.argv.slice(3)
const tree = execFileSync("git", ["ls-tree", "-r", "--full-tree", sourceCommit], {
  encoding: "utf8",
})
const blobs = new Map(
  tree
    .trim()
    .split("\n")
    .map((line) => {
      const [object, path] = line.split("\t")
      return [path, object.split(" ")[2]]
    }),
)
const manifest = JSON.parse(await readFile("public/prebuilt-ti-evms/manifest.json", "utf8"))
const components: Record<string, string> = {
  beagleplay: "BeaglePlay",
  "beaglebone-black": "BeagleBoneBlack",
  "sk-am62": "SkAm62",
  tmds62levm: "Tmds62lEvm",
}
for (const id of requestedBoards)
  if (!tiEvms.some((board) => board.id === id)) throw new Error(`Unknown board: ${id}`)

for (const board of tiEvms.filter(
  (entry) => requestedBoards.length === 0 || requestedBoards.includes(entry.id),
)) {
  const directory = resolve(outputRoot, `${board.id}-reference-design`)
  await mkdir(directory, { recursive: true })
  const assets: { path: string; output: string; gitBlob: string; elementCount?: number }[] = []
  const addAsset = (path: string, output: string, elementCount?: number) => {
    const gitBlob = blobs.get(path)
    if (!gitBlob) throw new Error(`Missing source asset: ${path}`)
    assets.push({ path, output, gitBlob, ...(elementCount === undefined ? {} : { elementCount }) })
  }
  addAsset(`lib/generated/ti-evms/${board.id}.circuit.tsx`, "dist/source.circuit.tsx")
  addAsset(`public/board-details/${board.id}/3d.png`, "dist/3d.png")
  for (const variant of board.variants) {
    const name = variant.id.replaceAll("-", "_")
    const prefix = `dist/${name}`
    const artifact = manifest.boards
      .find((entry: any) => entry.id === board.id)
      ?.artifacts.find((entry: any) => entry.output === variant.circuitJsonUrl.slice(1))
    if (!artifact) throw new Error(`Missing build provenance: ${board.id}/${variant.id}`)
    addAsset(`public${variant.circuitJsonUrl}`, `${prefix}/circuit.json.gz`, artifact.elementCount)
    addAsset(`public${variant.prebuiltCadSceneUrl}`, `${prefix}/3d.glb`)
    const urls = getTiEvmVariantSchematicCircuitJsonUrls(variant)
    for (const [position, sheetIndex] of variant.visibleSchematicSheetIndexes.entries()) {
      const label =
        board.schematicSheetLabels[sheetIndex]
          .replace(/\.SchDoc$/i, "")
          .replace(/^P?\d+[_\s.-]*/i, "")
          .replace(/[^a-zA-Z0-9]+/g, "_") || "Sheet"
      addAsset(
        `public${urls[position]}`,
        `${prefix}/schematic-${String(sheetIndex + 1).padStart(2, "0")}_${label}.json.gz`,
      )
    }
  }
  const features = [...new Set(board.variants.flatMap((variant) => variant.removedFeatureIds))]
  const presets = Object.fromEntries(
    board.variants.map((variant) => [
      variant.id.replaceAll("-", "_"),
      { removedFeatureIds: variant.removedFeatureIds },
    ]),
  )
  const source = `import { z } from "zod"\nimport { ${components[board.id]} as Board } from "./dist/source.circuit"\n\nexport const propsSchema = z.object({ removedFeatureIds: z.array(z.enum(${JSON.stringify(features)})).default([]) })\nexport const presets = ${JSON.stringify(presets, null, 2)}\n\nexport default function ReferenceDesign(input: z.input<typeof propsSchema> = {}) {\n  return <Board {...propsSchema.parse(input)} />\n}\n`
  await writeFile(resolve(directory, "index.circuit.tsx"), source)
  await writeFile(
    resolve(directory, "reference-package.json"),
    JSON.stringify({ repository, sourceCommit, board: board.id, assets }, null, 2),
  )
  await copyFile(
    resolve(import.meta.dir, "registry-package/build-package.ts"),
    resolve(directory, "build-package.ts"),
  )
  await copyFile("LICENSE", resolve(directory, "LICENSE"))
  await writeFile(
    resolve(directory, "package.json"),
    JSON.stringify(
      {
        name: `${board.id}-reference-design`,
        version: "1.0.0",
        type: "module",
        description: board.description,
        license: "MIT",
        main: "dist/index.cjs",
        module: "dist/index.js",
        types: "dist/index.d.ts",
        scripts: { build: "bun run build-package.ts" },
        dependencies: { react: "19.3.0", tscircuit: "0.0.3043", zod: "3.25.76" },
      },
      null,
      2,
    ),
  )
  await writeFile(
    resolve(directory, "tscircuit.config.json"),
    JSON.stringify({ mainEntrypoint: "index.circuit.tsx", buildCommand: "bun run build" }, null, 2),
  )
  await writeFile(
    resolve(directory, "tsconfig.json"),
    JSON.stringify({ compilerOptions: { jsx: "react-jsx", jsxImportSource: "react" } }, null, 2),
  )
  await writeFile(
    resolve(directory, "README.md"),
    `# ${board.name} reference design\n\n${board.description}\n\nThe configurations, preserved PCB routing, authored schematic sheets, and assembly GLBs come from ${repository} at ${sourceCommit}. The build verifies each Git blob against that revision and publishes ordinary package artifacts. The parameterized TSX remains available in dist/source.circuit.tsx.\n\nSource reference: ${board.sourceUrl}\n\nRun bun install and bun run build locally, or push the source with tsci push to use the normal registry cloud build. Rebuild the upstream configurator before exporting when changing board geometry or configurations.\n`,
  )
  console.log(`${board.name}: ${board.variants.length} configurations → ${directory}`)
}
