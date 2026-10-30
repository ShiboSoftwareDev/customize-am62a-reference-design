import { expect, test } from "bun:test"
import "bun-match-svg"
import { convertAltiumPcbDocToCircuitJson } from "altium-to-circuit-json"
import { AltiumPadRecord, parseAltiumPcbDoc } from "altiumts"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { applyAllegroPlacementBoundaries } from "../scripts/ti-evm-reference-generator/apply-allegro-placement-boundaries"

test("TI's U12 package placement outlines remain mechanical rather than shorting its 425 pads", async () => {
  const pcbDocument = parseAltiumPcbDoc(
    await Bun.file(`${import.meta.dir}/fixtures/sk-am62-package-placement.PcbDoc`).text(),
  )
  const before = convertAltiumPcbDocToCircuitJson(pcbDocument)
  expect(before.filter((element) => element.type === "pcb_copper_pour")).toHaveLength(3)
  expect(
    applyAllegroPlacementBoundaries({
      pcbDocument,
      allegroAsciiExport: await Bun.file(
        `${import.meta.dir}/fixtures/sk-am62-package-placement.alg`,
      ).text(),
    }),
  ).toBe(2)
  const after = convertAltiumPcbDocToCircuitJson(pcbDocument)
  // The real unassigned custom pin shape survives. Only the matching top and
  // bottom package-placement outlines stop being represented as conductors.
  expect(after.filter((element) => element.type === "pcb_copper_pour")).toHaveLength(1)
  const padsBefore = before.filter((element) => element.type === "pcb_smtpad")
  expect(padsBefore).toHaveLength(425)
  expect(
    new Set(
      pcbDocument.records.flatMap((record) =>
        record instanceof AltiumPadRecord ? [record.netIndex] : [],
      ),
    ).size,
  ).toBeGreaterThan(100)
  expect(after.filter((element) => element.type === "pcb_smtpad")).toEqual(padsBefore)
  for (const [label, circuitJson] of [
    ["before", before],
    ["after", after],
  ] as const) {
    await expect(
      convertCircuitJsonToPcbSvg(circuitJson, {
        includeVersion: false,
        layer: "top",
        hiddenLayerOpacity: 0,
        showSolderMask: false,
        viewport: { minX: 20, maxX: 44, minY: 83, maxY: 109 },
      }),
    ).toMatchSvgSnapshot(import.meta.path, label)
  }
})
