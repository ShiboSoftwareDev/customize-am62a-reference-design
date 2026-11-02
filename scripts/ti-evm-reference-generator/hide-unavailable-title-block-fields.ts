import { resolveSchematicParameterReferenceWithContext, type AltiumSchDoc } from "altiumts"
import type { ConvertAltiumSchDocOptions } from "altium-to-circuit-json"
import { setSchematicField } from "./set-schematic-field"

const optionalTitleReferences = new Set([
  "=date",
  "=modifieddate",
  "=page modify date",
  "=variant name",
])

export function hideUnavailableTitleBlockFields(params: {
  document: AltiumSchDoc
  options: ConvertAltiumSchDocOptions
}): void {
  for (const record of params.document.records) {
    if (record.recordKind !== "41" || record.getBoolean("ISHIDDEN")) continue
    const reference = record.getDecoded("TEXT")
    if (!reference || !optionalTitleReferences.has(reference.toLowerCase())) continue
    const owner = params.document.getParent(record)
    if (!owner || params.document.getOwnedRecords(owner).some((child) => child.recordKind === "2"))
      continue
    const text = resolveSchematicParameterReferenceWithContext({
      document: params.document,
      ...params.options,
      record,
      reference,
    })
    // These exports have no authoring timestamp or selected variant. Keep those cells blank.
    if (text === undefined) setSchematicField({ record, key: "ISHIDDEN", text: "T" })
  }
}
