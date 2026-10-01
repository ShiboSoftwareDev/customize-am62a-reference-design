export function getSchematicAssetFileName(schematicSheetIndex: number): string {
  return schematicSheetIndex === 0 ? "schematic.svg" : `schematic-${schematicSheetIndex + 1}.svg`
}
