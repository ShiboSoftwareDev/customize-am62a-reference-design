import { expect } from "bun:test"
import { resolve } from "node:path"
import "bun-match-svg"
import { convertCircuitJsonToPcbSvg, convertCircuitJsonToSchematicSvg } from "circuit-to-svg"
import { parsePrebuiltCircuitJson } from "app/parse-prebuilt-circuit-json"
import type { TiEvmId } from "lib/ti-evm-catalog"

export async function expectFullBoardSvgSnapshots(params: {
  evmId: TiEvmId
  testPath: string
}): Promise<void> {
  const artifactPath = resolve(
    import.meta.dir,
    `../../public/prebuilt-ti-evms/${params.evmId}/full-board.circuit.json.gz`,
  )
  const artifactBytes = new Uint8Array(await Bun.file(artifactPath).arrayBuffer())
  const circuitJson = parsePrebuiltCircuitJson(artifactBytes)

  const pcbSvg = convertCircuitJsonToPcbSvg(circuitJson, {
    includeVersion: false,
    showErrorsInTextOverlay: false,
  })
  const schematicSvg = convertCircuitJsonToSchematicSvg(circuitJson, {
    includeVersion: false,
  })

  await expect(pcbSvg).toMatchSvgSnapshot(params.testPath, "pcb")
  await expect(schematicSvg).toMatchSvgSnapshot(params.testPath, "schematic")
}
