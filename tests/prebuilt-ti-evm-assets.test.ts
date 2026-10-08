import { expect, test } from "bun:test"
import { resolve } from "node:path"
import { parsePrebuiltCircuitJson } from "app/parse-prebuilt-circuit-json"
import { getReferenceSchematicComponentName } from "lib/evms/get-reference-schematic-component-name"
import { getParameterizedTiEvmDefinition } from "lib/evms/parameterized-ti-evms"
import { tiEvms } from "lib/ti-evm-catalog"

type PrebuiltManifest = {
  boards: Array<{
    id: string
    artifacts: Array<{
      elementCount: number
      output: string
      pcbTraceCount: number
      source: string
      sourceComponentCount: number
      sourceTraceCount: number
      schematicOutputs?: string[]
    }>
  }>
  sources: Array<{ name: string; source: string; url: string }>
}

test("every catalog board has prebuilt output from parameterized TSX", async () => {
  const repositoryRoot = resolve(import.meta.dir, "..")
  const manifest = (await Bun.file(
    resolve(repositoryRoot, "public/prebuilt-ti-evms/manifest.json"),
  ).json()) as PrebuiltManifest

  expect(manifest.boards.map(({ id }) => id)).toEqual([
    "dp83825evm",
    "drv8307evm",
    "lm5155evm-fly",
    "lm251772evm-pd",
    "lmg342x-bb-evm",
  ])
  expect(manifest.boards.map(({ artifacts }) => artifacts.length)).toEqual([7, 6, 4, 6, 8])
  expect(manifest.sources).toHaveLength(5)

  for (const board of manifest.boards) {
    for (const artifact of board.artifacts) {
      expect(artifact.source).toContain("Parameterized")
      const prebuiltFile = Bun.file(resolve(repositoryRoot, "public", artifact.output))
      expect(await prebuiltFile.exists()).toBe(true)
      expect(prebuiltFile.size).toBeGreaterThan(0)
      expect(artifact.elementCount).toBeGreaterThan(100)
      expect(artifact.sourceComponentCount).toBeGreaterThan(0)
      expect(artifact.sourceTraceCount).toBeGreaterThan(0)
      expect(artifact.pcbTraceCount).toBeGreaterThan(0)
    }
  }

  for (const evm of tiEvms) {
    const definition = getParameterizedTiEvmDefinition(evm.id)
    for (const variant of evm.variants) {
      const removedComponentNames = new Set(
        definition.components.flatMap((component) =>
          component.removableFeatureId !== undefined &&
          variant.removedFeatureIds.includes(component.removableFeatureId)
            ? [getReferenceSchematicComponentName(component)]
            : [],
        ),
      )
      const schematics = await Promise.all(
        variant.schematicCircuitJsonUrls.map((url) =>
          loadCompressedCircuitJson(repositoryRoot, url),
        ),
      )
      expect(
        schematics.reduce(
          (count, schematic) =>
            count + schematic.filter(({ type }) => type === "schematic_component").length,
          0,
        ),
      ).toBeGreaterThan(10)
      const renderedComponentNames = new Set(
        schematics.flatMap((schematic) =>
          schematic.flatMap((element) =>
            element.type === "source_component" && typeof element.name === "string"
              ? [element.name]
              : [],
          ),
        ),
      )
      for (const componentName of removedComponentNames) {
        expect(renderedComponentNames.has(componentName)).toBe(false)
      }
    }
  }
})

async function loadCompressedCircuitJson(repositoryRoot: string, publicUrl: string) {
  const path = resolve(repositoryRoot, "public", publicUrl.replace(/^\//u, ""))
  return parsePrebuiltCircuitJson(new Uint8Array(await Bun.file(path).arrayBuffer()))
}
