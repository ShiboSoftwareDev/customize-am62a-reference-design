import type { AltiumPcbDocument, AltiumPolygonRecord } from "altiumts"

export function getSourcePourClearance(params: {
  pcbDocument: AltiumPcbDocument
  polygon: AltiumPolygonRecord
}): number {
  const layerNames = new Set([params.polygon.layer?.toUpperCase()])
  const midLayer = /^MID(\d+)$/iu.exec(params.polygon.layer ?? "")
  const layerOrdinal = midLayer?.[1] ? Number(midLayer[1]) + 1 : undefined
  for (const entry of params.pcbDocument.board?.layerStack.entries ?? []) {
    const layerId = entry.layerId === undefined ? entry.index : Number(entry.layerId) % 65536
    if (layerOrdinal !== undefined && layerId === layerOrdinal && entry.name) {
      layerNames.add(entry.name.toUpperCase())
    }
  }
  const clearances = params.pcbDocument.rules.flatMap((rule) => {
    if (rule.enabled === false || rule.ruleKind?.toUpperCase() !== "CLEARANCE") return []
    if (rule.clearanceMils === undefined || rule.clearanceMils <= 0) return []
    const layerScopes = [
      ...`${rule.scope1Expression} ${rule.scope2Expression}`.matchAll(/OnLayer\('([^']+)'\)/giu),
    ]
    if (
      layerScopes.length > 0 &&
      !layerScopes.some((match) => layerNames.has(match[1]?.toUpperCase()))
    )
      return []
    return [rule.clearanceMils * 0.0254]
  })
  if (clearances.length === 0) {
    throw new Error(`No positive clearance rule for polygon on ${params.polygon.layer}`)
  }
  // Use a conservative generic source gap for computed expansion. Altium's
  // room-, net-class-, and object-specific rules need separate handling.
  return Math.max(...clearances)
}
