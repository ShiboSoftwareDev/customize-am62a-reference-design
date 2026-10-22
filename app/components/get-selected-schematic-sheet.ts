export type SchematicSheetSelection = {
  index: number
  label: string | undefined
}

export function getSelectedSchematicSheet({
  requestedLabel,
  labels,
}: {
  requestedLabel: string | undefined
  labels: string[]
}): SchematicSheetSelection {
  const requestedIndex = requestedLabel === undefined ? -1 : labels.indexOf(requestedLabel)
  if (requestedIndex >= 0) {
    return { index: requestedIndex, label: requestedLabel }
  }

  return { index: 0, label: labels[0] }
}
