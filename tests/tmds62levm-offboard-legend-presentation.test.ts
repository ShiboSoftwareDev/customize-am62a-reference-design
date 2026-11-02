import { expect, test } from "bun:test"
import "bun-match-svg"
import { getPcbElementBounds } from "@tscircuit/circuit-json-util"
import { parsePrebuiltCircuitJson } from "app/parse-prebuilt-circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"

test("TMDS62LEVM fabrication-legend presentation", async () => {
  const originalCircuitJson = parsePrebuiltCircuitJson(
    await Bun.file(
      new URL("../public/prebuilt-ti-evms/tmds62levm/full-board.circuit.json.gz", import.meta.url),
    ).bytes(),
  )
  const circuitJson = originalCircuitJson.filter((element) => {
    if (element.type === "pcb_board") return true
    const isCopperText = element.type === "pcb_copper_text" && element.layer === "top"
    const isUnassignedTrack =
      element.type === "pcb_trace" &&
      !element.source_trace_id &&
      !element.source_net_id &&
      Array.isArray(element.route) &&
      element.route.some((point) => point.layer === "top")
    const bounds = getPcbElementBounds(element)
    return (isCopperText || isUnassignedTrack) && bounds !== null && bounds.maxY < 10
  })
  await expect(
    convertCircuitJsonToPcbSvg(circuitJson, {
      includeVersion: false,
      viewport: { minX: -5, maxX: 140, minY: -45, maxY: 10 },
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
