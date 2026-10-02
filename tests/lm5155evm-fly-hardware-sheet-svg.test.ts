import { expect, test } from "bun:test"
import { resolve } from "node:path"
import "bun-match-svg"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"
import { parsePrebuiltCircuitJson } from "app/parse-prebuilt-circuit-json"
import { getTiEvm } from "lib/ti-evm-catalog"

test("LM5155EVM-FLY prebuild includes its hardware schematic sheet", async () => {
  const fullBoard = getTiEvm("lm5155evm-fly").variants.find(({ id }) => id === "full-board")
  if (!fullBoard) throw new Error("LM5155EVM-FLY has no full-board variant")
  expect(fullBoard.schematicCircuitJsonUrls).toHaveLength(2)
  const schematicArtifactPath = resolve(
    import.meta.dir,
    `../public/${fullBoard.schematicCircuitJsonUrls[1].replace(/^\//u, "")}`,
  )
  const schematicArtifactBytes = new Uint8Array(await Bun.file(schematicArtifactPath).arrayBuffer())
  const schematicCircuitJson = parsePrebuiltCircuitJson(schematicArtifactBytes)
  const schematicSvg = convertCircuitJsonToSchematicSvg(schematicCircuitJson, {
    includeVersion: false,
  }).replace(/[ \t]+$/gmu, "")

  await expect(schematicSvg).toMatchSvgSnapshot(import.meta.path, "schematic")
})
