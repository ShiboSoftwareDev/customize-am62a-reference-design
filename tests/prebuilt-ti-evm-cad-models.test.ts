import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { resolve } from "node:path"
import { parsePrebuiltCircuitJson } from "app/parse-prebuilt-circuit-json"
import { getTiEvmVariant, tiEvms } from "lib/ti-evm-catalog"

type CadComponentWithStepModel = AnyCircuitElement & {
  type: "cad_component"
  model_step_url: string
}

test("prebuilt full-board EVMs retain their extracted Altium CAD models", async () => {
  const repositoryRoot = resolve(import.meta.dir, "..")
  const cadModelCounts: number[] = []

  for (const evm of tiEvms) {
    const fullBoard = getTiEvmVariant(evm, "full-board")
    const circuitJson = parsePrebuiltCircuitJson(
      new Uint8Array(
        await Bun.file(
          resolve(repositoryRoot, "public", fullBoard.circuitJsonUrl.replace(/^\//u, "")),
        ).arrayBuffer(),
      ),
    )
    const cadComponents = circuitJson.filter(
      (element): element is CadComponentWithStepModel =>
        element.type === "cad_component" && element.model_step_url !== undefined,
    )
    cadModelCounts.push(cadComponents.length)

    for (const cadComponent of cadComponents) {
      expect(cadComponent.model_step_url).toStartWith(`/cad-models/ti-evms/${evm.id}/`)
      expect(
        await Bun.file(
          resolve(repositoryRoot, "public", cadComponent.model_step_url.replace(/^\//u, "")),
        ).exists(),
      ).toBe(true)
    }
  }

  expect(cadModelCounts).toEqual([23, 6, 24, 94, 77])
})
