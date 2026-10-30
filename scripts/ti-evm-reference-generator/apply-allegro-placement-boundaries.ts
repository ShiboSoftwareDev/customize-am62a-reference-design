import {
  AltiumRegionRecord,
  ALTIUM_NO_INDEX,
  getAltiumPcbDocumentLayerStackEntries,
  getPcbRecordComponent,
  getPcbRegionGeometry,
  type AltiumPcbDocument,
} from "altiumts"
import { getAllegroBoundaryKey } from "./get-allegro-boundary-key"
import { parseAllegroPlacementBoundaries } from "./parse-allegro-placement-boundaries"

type LayerName = string

export function applyAllegroPlacementBoundaries({
  allegroAsciiExport,
  pcbDocument,
}: {
  allegroAsciiExport: string
  pcbDocument: AltiumPcbDocument
}): number {
  const layerNamesByBoundaryKey = parseAllegroPlacementBoundaries(allegroAsciiExport)
  const layersByName = new Map<LayerName, string>(
    getAltiumPcbDocumentLayerStackEntries(pcbDocument).flatMap((layer) =>
      layer.name && layer.layerId ? [[layer.name, layer.layerId] as const] : [],
    ),
  )
  let restoredBoundaryCount = 0
  for (const record of pcbDocument.records) {
    if (!(record instanceof AltiumRegionRecord) || record.regionKind !== "COPPER") continue
    if (record.netIndex !== undefined && record.netIndex !== ALTIUM_NO_INDEX) continue
    if (!["TOP", "BOTTOM"].includes(record.layer ?? "")) continue
    const component = getPcbRecordComponent(pcbDocument, record)
    if (!component?.footprint || !record.layer) continue
    const geometry = getPcbRegionGeometry(record)
    if (geometry.holes.length > 0) continue
    const layerName = layerNamesByBoundaryKey.get(
      getAllegroBoundaryKey({
        footprint: component.footprint,
        layer: record.layer,
        points: geometry.outline.points,
      }),
    )
    if (!layerName) continue
    const layerId = layersByName.get(layerName)
    if (!layerId) throw new Error(`Altium board has no mechanical layer ${layerName}`)
    // The community Allegro import put these package placement boundaries on
    // copper layers. Restore their original mechanical layers; a placement
    // boundary is neither conductive copper nor a copper-routing keepout.
    record.set("LAYER", layerId)
    record.set("V7_LAYER", layerId)
    restoredBoundaryCount += 1
  }
  return restoredBoundaryCount
}
