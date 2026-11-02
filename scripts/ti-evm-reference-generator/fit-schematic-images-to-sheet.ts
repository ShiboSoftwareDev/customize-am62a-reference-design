import { getSchematicPoint, type AltiumSchDoc } from "altiumts"
import { applyToPoint, translate } from "transformation-matrix"
import { getCustomSchematicSheetSize } from "./get-custom-schematic-sheet-size"
import { setSchematicField } from "./set-schematic-field"

export function fitSchematicImagesToSheet(document: AltiumSchDoc): void {
  const sheetSize = getCustomSchematicSheetSize(document)
  if (!sheetSize) return
  for (const record of document.records) {
    if (record.type !== "schematic-image-record") continue
    const location = getSchematicPoint(record, { xKey: "LOCATION.X", yKey: "LOCATION.Y" })
    const corner = getSchematicPoint(record, { xKey: "CORNER.X", yKey: "CORNER.Y" })
    if (!location || !corner) continue
    const width = Math.abs(corner.x - location.x)
    const height = Math.abs(corner.y - location.y)
    if (width > sheetSize.width || height > sheetSize.height) continue
    const minimumX = Math.min(location.x, corner.x)
    const minimumY = Math.min(location.y, corner.y)
    const offsetX = Math.max(0, Math.min(minimumX, sheetSize.width - width)) - minimumX
    const offsetY = Math.max(0, Math.min(minimumY, sheetSize.height - height)) - minimumY
    if (offsetX === 0 && offsetY === 0) continue
    // Preserve the image dimensions; only move an exported annotation back onto its paper.
    const exportedToPaperTransform = translate(offsetX, offsetY)
    for (const [prefix, point] of [
      ["LOCATION", location],
      ["CORNER", corner],
    ] as const) {
      const paperPoint = applyToPoint(exportedToPaperTransform, point)
      for (const axis of ["x", "y"] as const) {
        const coordinate = paperPoint[axis]
        const integer = Math.floor(coordinate)
        const key = `${prefix}.${axis.toUpperCase()}`
        setSchematicField({ record, key, text: String(integer) })
        setSchematicField({
          record,
          key: `${key}_FRAC`,
          text: String(Math.round((coordinate - integer) * 100_000)),
        })
      }
    }
  }
}
