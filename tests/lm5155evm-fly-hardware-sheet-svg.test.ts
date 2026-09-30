import { expect, test } from "bun:test"
import { resolve } from "node:path"
import "bun-match-svg"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"
import { parsePrebuiltCircuitJson } from "app/parse-prebuilt-circuit-json"

test("LM5155EVM-FLY hardware schematic sheet", async () => {
  const schematicArtifactPath = resolve(
    import.meta.dir,
    "../lib/generated/ti-evms/lm5155evm-fly.schematic-2.circuit.json.gz",
  )
  const schematicArtifactBytes = new Uint8Array(await Bun.file(schematicArtifactPath).arrayBuffer())
  const schematicCircuitJson = parsePrebuiltCircuitJson(schematicArtifactBytes)
  const schematicSvg = convertCircuitJsonToSchematicSvg(schematicCircuitJson, {
    includeVersion: false,
  }).replace(/[ \t]+$/gmu, "")

  await expect(schematicSvg).toMatchSvgSnapshot(import.meta.path, "schematic")
})
