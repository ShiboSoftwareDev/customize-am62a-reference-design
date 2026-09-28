import { expect, test } from "bun:test"
import { parsePrebuiltCircuitJson } from "app/parse-prebuilt-circuit-json"
import { boosterPackBoards, boosterPackSourceCommit } from "lib/boosterpack-configurations"

test("loads every prebuilt configuration as valid Circuit JSON", async () => {
  const manifest = await Bun.file(
    new URL("../public/prebuilt-boosterpacks/manifest.json", import.meta.url),
  ).json()
  expect(manifest.sourceCommit).toBe(boosterPackSourceCommit)
  expect(manifest.configurations).toHaveLength(
    boosterPackBoards.flatMap(({ configurations }) => configurations).length,
  )
  const compressedAssetHashes = new Set<string>()

  for (const configuration of boosterPackBoards.flatMap(({ configurations }) => configurations)) {
    const assetUrl = new URL(`../public${configuration.circuitJsonUrl}`, import.meta.url)
    const compressedBytes = new Uint8Array(await Bun.file(assetUrl).arrayBuffer())
    const compressedAssetHash = Bun.hash(compressedBytes).toString()
    expect(compressedAssetHashes.has(compressedAssetHash)).toBe(false)
    compressedAssetHashes.add(compressedAssetHash)
    const circuitJson = parsePrebuiltCircuitJson(compressedBytes)

    expect(circuitJson.some(({ type }) => type === "pcb_board")).toBe(true)
    expect(circuitJson.some(({ type }) => type === "source_failed_to_create_component_error")).toBe(
      false,
    )
    const renderedElementNames = new Set(
      circuitJson.flatMap((element) =>
        "name" in element && typeof element.name === "string" ? [element.name] : [],
      ),
    )
    for (const excludedElementName of configuration.excludedElementNames) {
      expect(renderedElementNames.has(excludedElementName)).toBe(false)
    }
    expect(
      manifest.configurations.find(
        ({ configurationId }: { configurationId: string }) => configurationId === configuration.id,
      )?.removedFeatureIds,
    ).toEqual(configuration.removedFeatureIds)
  }
})
