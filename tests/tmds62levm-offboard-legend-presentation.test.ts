import { expect, test } from "bun:test"
import "bun-match-svg"
import { parsePrebuiltCircuitJson } from "app/parse-prebuilt-circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"

test("TMDS62LEVM fabrication-legend presentation", async () => {
  const circuitJson = parsePrebuiltCircuitJson(
    await Bun.file(
      new URL("../public/prebuilt-ti-evms/tmds62levm/full-board.circuit.json.gz", import.meta.url),
    ).bytes(),
  ).filter(
    (element) =>
      element.type === "pcb_board" ||
      element.type.startsWith("pcb_silkscreen_") ||
      element.type.startsWith("pcb_fabrication_note_"),
  )
  await expect(
    convertCircuitJsonToPcbSvg(circuitJson, { includeVersion: false }),
  ).toMatchSvgSnapshot(import.meta.path)
})
