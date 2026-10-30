import { expect, test } from "bun:test"
import { AltiumRegionRecord, parseAltiumPcbDoc } from "altiumts"
import { applyAllegroPlacementBoundaries } from "../scripts/ti-evm-reference-generator/apply-allegro-placement-boundaries"

test("placement reconciliation preserves assigned copper and nonmatching contours", async () => {
  const pcbDocument = parseAltiumPcbDoc(
    await Bun.file(`${import.meta.dir}/fixtures/sk-am62-package-placement.PcbDoc`).text(),
  )
  const regions = pcbDocument.records.filter(
    (record): record is AltiumRegionRecord => record instanceof AltiumRegionRecord,
  )
  regions[0].set("NET", "0")
  regions[1].set("VX0", "894.47mil")
  const before = regions.map((record) => record.getString())
  expect(
    applyAllegroPlacementBoundaries({
      pcbDocument,
      allegroAsciiExport: await Bun.file(
        `${import.meta.dir}/fixtures/sk-am62-package-placement.alg`,
      ).text(),
    }),
  ).toBe(0)
  expect(regions.map((record) => record.getString())).toEqual(before)
})
