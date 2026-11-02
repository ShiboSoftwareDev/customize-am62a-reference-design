import type { AltiumSchDoc } from "altiumts"

export function getCustomSchematicSheetSize(document: AltiumSchDoc):
  | {
      width: number
      height: number
    }
  | undefined {
  const sheet = document.records.find((record) => record.recordKind === "31")
  if (!sheet || (sheet.get("SHEETSTYLE") !== undefined && sheet.get("USECUSTOMSHEET") !== "T"))
    return undefined
  const width = sheet.getNumber("CUSTOMX")
  const height = sheet.getNumber("CUSTOMY")
  if (!width || !height || width <= 0 || height <= 0) return undefined
  return { width, height }
}
