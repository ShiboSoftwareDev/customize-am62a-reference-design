import type { AltiumRecord } from "altiumts"

export function setSchematicField({
  record,
  key,
  text,
}: {
  record: AltiumRecord
  key: string
  text: string
}): void {
  const originalKey = record.fields.find(
    (field) => field.key.toUpperCase() === key.toUpperCase(),
  )?.key
  record.set(originalKey ?? key, text)
}
