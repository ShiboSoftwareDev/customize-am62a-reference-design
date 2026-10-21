import { expect, test } from "bun:test"
import { parseReferenceEvmDefinition } from "lib/evms/parse-reference-evm-definition"

test("generated reference definitions are validated while parsing", () => {
  const serializedDefinition = JSON.stringify({
    id: "example",
    name: "Example",
    sourceUrl: "https://example.com",
    sourceArchiveSha256: "abc",
    sourceConnectivityArchiveSha256: "def",
    sourcePcbConnectivityPath: "board.alg",
    sourcePcbPath: "board.PcbDoc",
    sourceSchematicPaths: ["board.SchDoc"],
    outline: [],
    width: 1,
    height: 1,
    thickness: 1.6,
    layers: 2,
    components: [],
    nets: [],
    standaloneHoles: [],
    silkscreen: [],
  })

  const definition = parseReferenceEvmDefinition(serializedDefinition)
  expect(definition.id).toBe("example")
  expect(definition.sourcePcbConnectivityPath).toBe("board.alg")
  expect(() => parseReferenceEvmDefinition("{}")).toThrowError(
    "Generated reference EVM definition is invalid",
  )
})
