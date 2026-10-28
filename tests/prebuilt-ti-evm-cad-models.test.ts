import { expect, test } from "bun:test"
import { resolve } from "node:path"
import { parsePrebuiltCircuitJson } from "app/parse-prebuilt-circuit-json"
import type { AnyCircuitElement } from "circuit-json"
import { getTiEvmVariant, tiEvms } from "lib/ti-evm-catalog"

type RenderableCadComponent = AnyCircuitElement & {
  type: "cad_component"
  model_jscad?: unknown
  model_step_url?: string
}

test("prebuilt full-board EVMs retain their Altium CAD representation", async () => {
  const repositoryRoot = resolve(import.meta.dir, "..")

  for (const evm of tiEvms) {
    const fullBoard = getTiEvmVariant(evm, "full-board")
    const circuitJson = parsePrebuiltCircuitJson(
      new Uint8Array(
        await Bun.file(
          resolve(repositoryRoot, "public", fullBoard.circuitJsonUrl.replace(/^\//u, "")),
        ).arrayBuffer(),
      ),
    )
    const sourceCircuitJson = parsePrebuiltCircuitJson(
      new Uint8Array(
        await Bun.file(
          resolve(repositoryRoot, `lib/generated/ti-evms/${evm.id}.source.circuit.json.gz`),
        ).arrayBuffer(),
      ),
    )
    const sourceCadComponents = sourceCircuitJson.filter(isRenderableCadComponent)
    const generatedCadComponents = circuitJson.filter(isRenderableCadComponent)

    expect(generatedCadComponents.length > 0).toBe(sourceCadComponents.length > 0)

    for (const cadComponent of generatedCadComponents) {
      if (!cadComponent.model_step_url?.startsWith("/")) continue
      expect(
        await Bun.file(
          resolve(repositoryRoot, "public", cadComponent.model_step_url.replace(/^\//u, "")),
        ).exists(),
      ).toBe(true)
    }
  }
}, 30_000)

function isRenderableCadComponent(element: AnyCircuitElement): element is RenderableCadComponent {
  return (
    element.type === "cad_component" &&
    ("model_jscad" in element ||
      ("model_step_url" in element && typeof element.model_step_url === "string"))
  )
}
