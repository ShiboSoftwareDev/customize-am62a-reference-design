import { expect } from "bun:test"
import { resolve } from "node:path"
import { parsePrebuiltCircuitJson } from "app/parse-prebuilt-circuit-json"
import type { AnyCircuitElement } from "circuit-json"
import { getTiEvm, getTiEvmVariant, type TiEvmId } from "lib/ti-evm-catalog"

type StepModelUrl = string

type RenderableCadComponent = AnyCircuitElement & {
  type: "cad_component"
  model_jscad?: unknown
  model_step_url?: StepModelUrl
}

export async function expectPrebuiltCadModels(evmId: TiEvmId): Promise<void> {
  const repositoryRoot = resolve(import.meta.dir, "../..")
  const evm = getTiEvm(evmId)
  const fullBoard = getTiEvmVariant(evm, "full-board")
  const [generatedBytes, sourceBytes] = await Promise.all([
    Bun.file(
      resolve(repositoryRoot, "public", fullBoard.circuitJsonUrl.replace(/^\//u, "")),
    ).arrayBuffer(),
    Bun.file(
      resolve(repositoryRoot, `lib/generated/ti-evms/${evm.id}.source.circuit.json.gz`),
    ).arrayBuffer(),
  ])
  const generatedCadComponents = parsePrebuiltCircuitJson(new Uint8Array(generatedBytes)).filter(
    isRenderableCadComponent,
  )
  const sourceCadComponents = parsePrebuiltCircuitJson(new Uint8Array(sourceBytes)).filter(
    isRenderableCadComponent,
  )

  expect(generatedCadComponents.length > 0).toBe(sourceCadComponents.length > 0)
  const localModelUrls = new Set<StepModelUrl>()
  for (const cadComponent of generatedCadComponents) {
    if (cadComponent.model_step_url?.startsWith("/"))
      localModelUrls.add(cadComponent.model_step_url)
  }
  const modelFilesExist = await Promise.all(
    [...localModelUrls].map((modelUrl) =>
      Bun.file(resolve(repositoryRoot, "public", modelUrl.replace(/^\//u, ""))).exists(),
    ),
  )
  for (const exists of modelFilesExist) expect(exists).toBe(true)
}

function isRenderableCadComponent(element: AnyCircuitElement): element is RenderableCadComponent {
  return (
    element.type === "cad_component" &&
    ("model_jscad" in element ||
      ("model_step_url" in element && typeof element.model_step_url === "string"))
  )
}
