import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { gunzipSync, strFromU8 } from "fflate"

test("generated TI schematics resolve official project metadata", async () => {
  const references = [
    {
      id: "lm5155evm-fly",
      expected: ["BMC029A_SCH.SchDoc", "LM5155EVM-FLY", "BMC029", "Public Release", "2018"],
    },
    {
      id: "lm251772evm-pd",
      expected: ["SR135B.SchDoc", "LM251772EVM-PD", "SR135", "Public Release", "2025"],
    },
    {
      id: "lmg342x-bb-evm",
      expected: ["LMG342X_BB_EVM.SchDoc", "LMG342X-BB-EVM", "HVP049", "General Release", "2020"],
    },
  ] as const

  for (const reference of references) {
    const circuitJson = await readGeneratedSchematic(reference.id)
    const texts = circuitJson.flatMap((element) =>
      element.type === "schematic_text" ? [element.text] : [],
    )
    for (const expected of reference.expected) expect(texts).toContain(expected)
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
})

async function readGeneratedSchematic(id: string): Promise<AnyCircuitElement[]> {
  const file = Bun.file(
    new URL(`../lib/generated/ti-evms/${id}.schematic.circuit.json.gz`, import.meta.url),
  )
  return JSON.parse(strFromU8(gunzipSync(new Uint8Array(await file.arrayBuffer()))))
}
