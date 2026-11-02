import { expect, test } from "bun:test"
import { parseAltiumSchDoc } from "altiumts"
import { hideUnavailableTitleBlockFields } from "../scripts/ti-evm-reference-generator/hide-unavailable-title-block-fields"

test("only blanks unavailable optional title fields and preserves known dates and electrical parameters", () => {
  const document = parseAltiumSchDoc(
    [
      "|HEADER=Protel for Windows - Schematic Capture Ascii File Version 5.0",
      "|RECORD=31|CUSTOMX=240|CUSTOMY=140",
      "|RECORD=1|LIBREFERENCE=TitleBlock",
      "|RECORD=41|OWNERINDEX=1|NAME=PrintedDate|TEXT==Date",
      "|RECORD=41|OWNERINDEX=1|NAME=Variant|TEXT==Variant Name",
      "|RECORD=41|OWNERINDEX=1|NAME=Other|TEXT==Missing",
      "|RECORD=1|LIBREFERENCE=Jumper",
      "|RECORD=2|OWNERINDEX=5|NAME=1|DESIGNATOR=1",
      "|RECORD=41|OWNERINDEX=5|NAME=Date|TEXT==ModifiedDate",
      "|RECORD=41|OWNERINDEX=-1|ISHIDDEN=T|NAME=Date|TEXT=2026-11-02",
    ].join("\n"),
  )
  const fields = document.records.filter(
    (record) => record.recordKind === "41" && !record.getBoolean("ISHIDDEN"),
  )
  expect(fields).toHaveLength(4)
  hideUnavailableTitleBlockFields({ document, options: {} })
  expect(fields.map((record) => record.getBoolean("ISHIDDEN") === true)).toEqual([
    false,
    true,
    false,
    false,
  ])
})
