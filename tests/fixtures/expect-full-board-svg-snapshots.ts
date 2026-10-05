import { expect } from "bun:test"
import { resolve } from "node:path"
import "bun-match-svg"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg, convertCircuitJsonToSchematicSvg } from "circuit-to-svg"
import { parsePrebuiltCircuitJson } from "app/parse-prebuilt-circuit-json"
import type { TiEvmId } from "lib/ti-evm-catalog"
import { getTiEvm } from "lib/ti-evm-catalog"

export async function expectFullBoardSvgSnapshots(params: {
  evmId: TiEvmId
  testPath: string
}): Promise<AnyCircuitElement[]> {
  const artifactPath = resolve(
    import.meta.dir,
    `../../public/prebuilt-ti-evms/${params.evmId}/full-board.circuit.json.gz`,
  )
  const artifactBytes = new Uint8Array(await Bun.file(artifactPath).arrayBuffer())
  const circuitJson = parsePrebuiltCircuitJson(artifactBytes)
  const fullBoard = getTiEvm(params.evmId).variants.find(({ id }) => id === "full-board")
  if (!fullBoard) throw new Error(`${params.evmId} has no full-board variant`)
  const schematicArtifactPath = resolve(
    import.meta.dir,
    `../../public/${fullBoard.schematicCircuitJsonUrls[0].replace(/^\//u, "")}`,
  )
  const schematicArtifactBytes = new Uint8Array(await Bun.file(schematicArtifactPath).arrayBuffer())
  const schematicCircuitJson = parsePrebuiltCircuitJson(schematicArtifactBytes)

  const pcbSvg = convertCircuitJsonToPcbSvg(circuitJson, {
    includeVersion: false,
    showErrorsInTextOverlay: false,
  })
  const schematicSvg = convertCircuitJsonToSchematicSvg(schematicCircuitJson, {
    includeVersion: false,
  }).replace(/[ \t]+$/gmu, "")

  await expect(pcbSvg).toMatchSvgSnapshot(params.testPath, "pcb")
  await expect(schematicSvg).toMatchSvgSnapshot(params.testPath, "schematic")
  return circuitJson
}
