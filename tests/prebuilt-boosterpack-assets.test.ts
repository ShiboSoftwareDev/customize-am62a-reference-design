import { expect, test } from "bun:test"
import { parsePrebuiltCircuitJson } from "app/parse-prebuilt-circuit-json"
import { boosterPackBoards, boosterPackSourceCommit } from "lib/boosterpack-configurations"

test("loads every prebuilt configuration as valid Circuit JSON", async () => {
  const manifest = await Bun.file(
    new URL("../public/prebuilt-boosterpacks/manifest.json", import.meta.url),
  ).json()
  expect(manifest.sourceCommit).toBe(boosterPackSourceCommit)

  for (const configuration of boosterPackBoards.flatMap(({ configurations }) => configurations)) {
    const assetUrl = new URL(`../public${configuration.circuitJsonUrl}`, import.meta.url)
    const compressedBytes = new Uint8Array(await Bun.file(assetUrl).arrayBuffer())
    const circuitJson = parsePrebuiltCircuitJson(compressedBytes)

    expect(circuitJson.some(({ type }) => type === "pcb_board")).toBe(true)
    expect(circuitJson.some(({ type }) => type === "source_failed_to_create_component_error")).toBe(
      false,
    )
  }
})
