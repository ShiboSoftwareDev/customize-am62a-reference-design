export type ComponentName = string
export type SourceFootprint = string

export type SourceFootprintByComponentName = ReadonlyMap<ComponentName, SourceFootprint>

export async function readSourceFootprints(
  sourceFootprintPath: string,
): Promise<SourceFootprintByComponentName> {
  const sourceFootprintFile = Bun.file(sourceFootprintPath)
  if (!(await sourceFootprintFile.exists())) {
    throw new Error(`Missing component footprint map: ${sourceFootprintPath}`)
  }

  const sourceFootprints: unknown = await sourceFootprintFile.json()
  if (!isJsonObject(sourceFootprints)) {
    throw new Error(`Invalid component footprint map: ${sourceFootprintPath}`)
  }

  const sourceFootprintByComponentName = new Map<ComponentName, SourceFootprint>()
  for (const [componentName, sourceFootprint] of Object.entries(sourceFootprints)) {
    if (typeof sourceFootprint !== "string") {
      throw new Error(`Invalid source footprint for ${componentName}: ${sourceFootprintPath}`)
    }
    sourceFootprintByComponentName.set(componentName, sourceFootprint)
  }
  return sourceFootprintByComponentName
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
