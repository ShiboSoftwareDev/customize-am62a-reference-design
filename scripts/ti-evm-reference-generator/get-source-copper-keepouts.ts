import {
  AltiumFillRecord,
  type AltiumPcbDocument,
  AltiumRegionRecord,
  getAltiumPcbDocumentLayerStackEntries,
  getAltiumPcbLayerAliasKey,
  getAltiumPcbLayerAliasMap,
  getPcbRecordComponent,
  getPcbRegionGeometry,
} from "altiumts"
import { applyToPoint, compose, rotateDEG, scale, translate } from "transformation-matrix"
import type { CopperPolygon } from "./copper-keepout-geometry"
import type { ComponentName, FeatureId } from "./types"

export type SourceCopperKeepout = {
  sourceRecordIndex: number
  layer: string
  polygon: CopperPolygon
  removableFeatureId?: FeatureId
}

const altiumMilsToMmTransform = scale(0.0254)
const COPPER_RESTRICTION = 0x04

export function getSourceCopperKeepouts({
  pcbDocument,
  featureIdByComponentName,
}: {
  pcbDocument: AltiumPcbDocument
  featureIdByComponentName: ReadonlyMap<ComponentName, FeatureId>
}): SourceCopperKeepout[] {
  const layerAliases = getAltiumPcbLayerAliasMap(getAltiumPcbDocumentLayerStackEntries(pcbDocument))
  return pcbDocument.records.flatMap((record, sourceRecordIndex): SourceCopperKeepout[] => {
    if (record.getBoolean("KEEPOUT") !== true) return []
    const restrictions = record.getNumber("KEEPOUTRESTRICTIONS")
    // Older Altium files omit the object mask: their keepouts restrict copper.
    if (restrictions !== undefined && (restrictions & COPPER_RESTRICTION) === 0) return []
    let polygon: CopperPolygon
    if (record instanceof AltiumRegionRecord) {
      // Parser contours are already in board coordinates, including owned
      // primitives. Convert mils to mm without reapplying the component pose.
      const geometry = getPcbRegionGeometry(record)
      polygon = [geometry.outline, ...geometry.holes].map((contour) =>
        contour.points.map((point) => {
          const { x, y } = applyToPoint(altiumMilsToMmTransform, point)
          return [x, y]
        }),
      )
    } else if (record instanceof AltiumFillRecord && record.bounds) {
      const { minX, minY, maxX, maxY } = record.bounds
      const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }
      const fillLocalMilsToBoardMmTransform = compose(
        altiumMilsToMmTransform,
        translate(center.x, center.y),
        rotateDEG(record.rotation),
      )
      polygon = [
        [
          { x: minX - center.x, y: minY - center.y },
          { x: maxX - center.x, y: minY - center.y },
          { x: maxX - center.x, y: maxY - center.y },
          { x: minX - center.x, y: maxY - center.y },
        ].map((point) => {
          const { x, y } = applyToPoint(fillLocalMilsToBoardMmTransform, point)
          return [x, y]
        }),
      ]
    } else {
      // Arc and track keepouts follow the converter's existing primitive path.
      return []
    }
    if (!polygon[0] || polygon[0].length < 3) {
      throw new Error(`Copper keepout ${sourceRecordIndex} has no usable contour`)
    }
    const component = getPcbRecordComponent(pcbDocument, record)
    const removableFeatureId = component?.designator
      ? featureIdByComponentName.get(component.designator)
      : undefined
    return [
      {
        sourceRecordIndex,
        layer: getAltiumPcbLayerAliasKey(record.layer ?? "MULTILAYER", layerAliases),
        polygon,
        removableFeatureId,
      },
    ]
  })
}
