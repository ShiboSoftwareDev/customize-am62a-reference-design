import { expect, test } from "bun:test"
import { resolve } from "node:path"
import type { AnyCircuitElement } from "circuit-json"
import { gunzipSync, strFromU8 } from "fflate"
import { tiEvms } from "lib/ti-evm-catalog"

test("generated TI schematics resolve official project metadata", async () => {
  for (const evm of tiEvms) {
    for (const [schematicSheetIndex] of evm.schematicSheetLabels.entries()) {
      const circuitJson = await readGeneratedSchematic({
        evmId: evm.id,
        schematicSheetIndex,
      })
      const texts = circuitJson.flatMap((element) =>
        element.type === "schematic_text" ? [element.text] : [],
      )
      expect(circuitJson.length).toBeGreaterThan(0)
      for (const unresolved of [
        "=PRJ_Title",
        "=PRJ_Number",
        "=PRJ_Customer",
        "=CopyrightYear",
        "=DocumentName",
      ]) {
        expect(texts).not.toContain(unresolved)
      }
    }
  }
})

async function readGeneratedSchematic(params: {
  evmId: string
  schematicSheetIndex: number
}): Promise<AnyCircuitElement[]> {
  const schematicSuffix =
    params.schematicSheetIndex === 0 ? "" : `-${params.schematicSheetIndex + 1}`
  const path = resolve(
    import.meta.dir,
    `../lib/generated/ti-evms/${params.evmId}.schematic${schematicSuffix}.circuit.json.gz`,
  )
  return JSON.parse(strFromU8(gunzipSync(new Uint8Array(await Bun.file(path).arrayBuffer()))))
}
