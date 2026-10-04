import { expect, test } from "bun:test"
import { resolve } from "node:path"
import type { AnyCircuitElement } from "circuit-json"
import { parsePrebuiltCircuitJson } from "app/parse-prebuilt-circuit-json"

test("SK-AM62A-LP uses copperpour and prebuilds copper on every layer", async () => {
  const boardSource = await Bun.file(
    resolve(import.meta.dir, "../lib/generated/am62a-board.tsx"),
  ).text()
  const circuitJson = await loadFullBoard()
  const copperPours = circuitJson.filter(({ type }) => type === "pcb_copper_pour")
  const copperLayers = new Set(copperPours.map(({ layer }) => layer))

  expect(boardSource).toContain("<copperpour")
  expect(boardSource).not.toContain("<pcbcopperpour")
  expect(copperPours.length).toBeGreaterThan(1_000)
  expect(copperLayers).toEqual(
    new Set([
      "top",
      "inner1",
      "inner2",
      "inner3",
      "inner4",
      "inner5",
      "inner6",
      "inner7",
      "inner8",
      "inner9",
      "inner10",
      "bottom",
    ]),
  )
})

async function loadFullBoard(): Promise<AnyCircuitElement[]> {
  const path = resolve(
    import.meta.dir,
    "../public/prebuilt-ti-evms/sk-am62a-lp/full-board.circuit.json.gz",
  )
  return parsePrebuiltCircuitJson(new Uint8Array(await Bun.file(path).arrayBuffer()))
}
