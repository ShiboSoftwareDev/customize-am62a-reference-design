import { expect, test } from "bun:test"
import { parseAltiumSchDoc } from "altiumts"
import { hideOffSheetDraftingNotes } from "../scripts/ti-evm-reference-generator/hide-off-sheet-drafting-notes"

test("hides the off-sheet SK-AM62 JTAG drafting note without changing electrical records", async () => {
  const document = parseAltiumSchDoc(
    await Bun.file(new URL("fixtures/sk-am62-jtag-sheet.SchDoc", import.meta.url)).bytes(),
  )
  const note = document.records.find((record) =>
    record.getDecoded("TEXT")?.includes("It should be connected to PORz"),
  )
  if (!note) throw new Error("Missing original JTAG drafting note")
  expect(note.getBoolean("ISHIDDEN")).not.toBe(true)
  const electricalRecords = document.records.filter((record) => record.recordKind !== "4")
  const originalElectricalRecords = electricalRecords.map((record) => record.getString())

  hideOffSheetDraftingNotes(document)

  expect(note.getBoolean("ISHIDDEN")).toBe(true)
  expect(electricalRecords.map((record) => record.getString())).toEqual(originalElectricalRecords)
  const visibleNotes = document.records.filter(
    (record) => record.recordKind === "4" && !record.getBoolean("ISHIDDEN"),
  )
  expect(visibleNotes.length).toBeGreaterThan(0)
})
