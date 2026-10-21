import { expect, test } from "bun:test"
import { resolve } from "node:path"
import { parsePrebuiltCircuitJson } from "app/parse-prebuilt-circuit-json"
import type { AnyCircuitElement } from "circuit-json"

function hasRenderableCadModel(element: AnyCircuitElement): boolean {
  if (element.type !== "cad_component") return false
  return Boolean(
    element.model_glb_url ??
      element.model_gltf_url ??
      element.model_jscad ??
      element.model_obj_url ??
      element.model_step_url ??
      element.model_stl_url ??
      element.model_wrl_url,
  )
}

async function readCompressedCircuitJson(artifactPath: string): Promise<AnyCircuitElement[]> {
  return parsePrebuiltCircuitJson(new Uint8Array(await Bun.file(artifactPath).arrayBuffer()))
}

test("BeagleBone Black has PCB components but no renderable CAD models", async () => {
  const repositoryRoot = resolve(import.meta.dir, "..")
  const sourceCircuitJson = await readCompressedCircuitJson(
    resolve(repositoryRoot, "lib/generated/ti-evms/beaglebone-black.source.circuit.json.gz"),
  )
  const generatedCircuitJson = await readCompressedCircuitJson(
    resolve(repositoryRoot, "public/prebuilt-ti-evms/beaglebone-black/full-board.circuit.json.gz"),
  )

  expect({
    generatedBoundingBoxCadComponentCount: generatedCircuitJson.filter(
      (element) => element.type === "cad_component" && element.show_as_bounding_box,
    ).length,
    generatedPcbComponentCount: generatedCircuitJson.filter(
      (element) => element.type === "pcb_component",
    ).length,
    generatedRenderableCadComponentCount: generatedCircuitJson.filter(hasRenderableCadModel).length,
    sourceCadComponentCount: sourceCircuitJson.filter((element) => element.type === "cad_component")
      .length,
    sourcePcbComponentCount: sourceCircuitJson.filter((element) => element.type === "pcb_component")
      .length,
    sourceRenderableCadComponentCount: sourceCircuitJson.filter(hasRenderableCadModel).length,
  }).toMatchInlineSnapshot(`
    {
      "generatedBoundingBoxCadComponentCount": 382,
      "generatedPcbComponentCount": 1232,
      "generatedRenderableCadComponentCount": 0,
      "sourceCadComponentCount": 0,
      "sourcePcbComponentCount": 381,
      "sourceRenderableCadComponentCount": 0,
    }
  `)
})
