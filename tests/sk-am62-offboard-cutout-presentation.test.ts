import { expect, test } from "bun:test"
import "bun-match-svg"
import { parsePrebuiltCircuitJson } from "app/parse-prebuilt-circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"

test("SK-AM62 board-edge presentation", async () => {
  const circuitJson = parsePrebuiltCircuitJson(
    await Bun.file(
      new URL("../public/prebuilt-ti-evms/sk-am62/full-board.circuit.json.gz", import.meta.url),
    ).bytes(),
  ).filter((element) => ["pcb_board", "pcb_cutout", "pcb_silkscreen_text"].includes(element.type))
  await expect(
    convertCircuitJsonToPcbSvg(circuitJson, {
      includeVersion: false,
      viewport: { minX: -8, maxX: 85, minY: 139, maxY: 155 },
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
