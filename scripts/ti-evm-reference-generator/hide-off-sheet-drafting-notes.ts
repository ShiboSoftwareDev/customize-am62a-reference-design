import { getSchematicPoint, type AltiumSchDoc } from "altiumts"
import { getCustomSchematicSheetSize } from "./get-custom-schematic-sheet-size"
import { setSchematicField } from "./set-schematic-field"

export function hideOffSheetDraftingNotes(document: AltiumSchDoc): void {
  const sheetSize = getCustomSchematicSheetSize(document)
  if (!sheetSize) return
  for (const record of document.records) {
    if (record.recordKind !== "4" || document.getParent(record)) continue
    const position = getSchematicPoint(record, { xKey: "LOCATION.X", yKey: "LOCATION.Y" })
    if (
      position &&
      (position.x < 0 ||
        position.y < 0 ||
        position.x > sheetSize.width ||
        position.y > sheetSize.height)
    ) {
      setSchematicField({ record, key: "ISHIDDEN", text: "T" })
    }
  }
}
