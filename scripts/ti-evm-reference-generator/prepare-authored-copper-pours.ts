import { convertAltiumPcbDocToCircuitJson } from "altium-to-circuit-json"
import {
  AltiumFillRecord,
  AltiumPcbDoc,
  type AltiumPcbDocument,
  AltiumRegionRecord,
} from "altiumts"
import type { AnyCircuitElement } from "circuit-json"
import type { FeatureId, NetName, SourceComponentId } from "./types"
import { getSupportedCopperPours } from "./get-supported-copper-pours"
import { getSourcePourClearance } from "./get-source-pour-clearance"

type PcbCopperPourId = string
type SourceNetId = string
type NormalizedNetName = string
type PolygonIndex = number
type SourceCopperRecordKey = string

export type ComputedCopperPourSettings = {
  clearance: number
  preserveReferenceCopper?: boolean
  removableFeatureId?: FeatureId
}

export function prepareAuthoredCopperPours(params: {
  pcbDocument: AltiumPcbDocument
  circuitJson: AnyCircuitElement[]
  featureIdBySourceComponentId: ReadonlyMap<SourceComponentId, FeatureId>
}): {
  circuitJson: AnyCircuitElement[]
  computedCopperPourSettingsById: Map<PcbCopperPourId, ComputedCopperPourSettings>
} {
  // Convert authored boundaries and independent copper, without cached polygon
  // fragments. The converter also excludes keepout regions from copper.
  const polygonDocument = new AltiumPcbDoc({
    lines: [
      ...(params.pcbDocument.board ? [params.pcbDocument.board] : []),
      ...params.pcbDocument.nets,
      ...params.pcbDocument.polygons,
      ...params.pcbDocument.records.filter(
        (record) =>
          record instanceof AltiumFillRecord ||
          (record instanceof AltiumRegionRecord &&
            (record.regionKind === "POLYGON_CUTOUT" ||
              !params.pcbDocument.getPolygonForRecord(record))),
      ),
    ],
  })
  const polygonCircuitJson = convertAltiumPcbDocToCircuitJson(polygonDocument)
  const convertedNetNamesById = new Map<SourceNetId, string>(
    polygonCircuitJson.flatMap((element) =>
      element.type === "source_net" &&
      typeof element.source_net_id === "string" &&
      typeof element.name === "string"
        ? [[element.source_net_id, element.name] as const]
        : [],
    ),
  )
  const canonicalNetsByName = new Map<NormalizedNetName, { id: SourceNetId; name: NetName }>()
  for (const element of params.circuitJson) {
    if (element.type !== "source_net" || typeof element.name !== "string") continue
    if (typeof element.source_net_id !== "string") continue
    canonicalNetsByName.set(element.name.trim().toUpperCase(), {
      id: element.source_net_id,
      name: element.name,
    })
  }

  const records = params.pcbDocument.records
  const sourceRecordIndexes = new Map(records.map((record, recordIndex) => [record, recordIndex]))
  const polygonIndexByRecord = new Map(
    params.pcbDocument.polygons.map((polygon, polygonIndex) => [polygon, polygonIndex]),
  )
  const importedPolygonIndexByPourId = new Map<PcbCopperPourId, PolygonIndex>()
  for (const element of params.circuitJson) {
    if (element.type !== "pcb_copper_pour" || typeof element.pcb_copper_pour_id !== "string")
      continue
    const polygonMatch = /altium_polygon_(\d+)/u.exec(element.pcb_copper_pour_id)
    if (polygonMatch?.[1]) {
      importedPolygonIndexByPourId.set(element.pcb_copper_pour_id, Number(polygonMatch[1]))
      continue
    }
    const regionMatch = /altium_region_(\d+)/u.exec(element.pcb_copper_pour_id)
    const region = regionMatch?.[1] ? records[Number(regionMatch[1])] : undefined
    const polygon = region ? params.pcbDocument.getPolygonForRecord(region) : undefined
    const polygonIndex = polygon ? polygonIndexByRecord.get(polygon) : undefined
    if (polygonIndex !== undefined) {
      importedPolygonIndexByPourId.set(element.pcb_copper_pour_id, polygonIndex)
    }
  }

  const supportedCopperPours = getSupportedCopperPours(params)
  const supportedPoursById = new Map<PcbCopperPourId, (typeof supportedCopperPours)[number]>(
    supportedCopperPours.map((pour) => [pour.pcbCopperPourId, pour]),
  )
  const originalPoursByRecordKey = new Map<SourceCopperRecordKey, AnyCircuitElement>()
  for (const element of params.circuitJson) {
    if (element.type !== "pcb_copper_pour" || typeof element.pcb_copper_pour_id !== "string")
      continue
    const key = getSourceCopperRecordKey(element.pcb_copper_pour_id)
    if (key) originalPoursByRecordKey.set(key, element)
  }
  const featureIdsByPolygonIndex = new Map<PolygonIndex, Set<FeatureId | undefined>>()
  for (const pour of supportedCopperPours) {
    const polygonIndex = importedPolygonIndexByPourId.get(pour.pcbCopperPourId)
    if (polygonIndex === undefined) continue
    const featureIds = featureIdsByPolygonIndex.get(polygonIndex) ?? new Set()
    featureIds.add(pour.removableFeatureId)
    featureIdsByPolygonIndex.set(polygonIndex, featureIds)
  }

  const computedCopperPourSettingsById = new Map<PcbCopperPourId, ComputedCopperPourSettings>()
  const fixedPours: AnyCircuitElement[] = []
  const recomputedPolygonIndexes = new Set<PolygonIndex>()
  const authoredPours = polygonCircuitJson.flatMap((element) => {
    if (element.type !== "pcb_copper_pour" || typeof element.pcb_copper_pour_id !== "string")
      return []
    const netName =
      typeof element.source_net_id === "string"
        ? convertedNetNamesById.get(element.source_net_id)
        : undefined
    const canonicalNet = netName ? canonicalNetsByName.get(netName.trim().toUpperCase()) : undefined
    if (netName && !canonicalNet)
      throw new Error(`Authored copper pour references missing net ${netName}`)
    const polygonMatch = /altium_polygon_(\d+)/u.exec(element.pcb_copper_pour_id)
    const polygonIndex = polygonMatch?.[1] ? Number(polygonMatch[1]) : undefined
    if (polygonIndex === undefined) {
      const recordMatch = /altium_(region|fill)_(\d+)/u.exec(element.pcb_copper_pour_id)
      const convertedRecord = recordMatch?.[2]
        ? polygonDocument.records[Number(recordMatch[2])]
        : undefined
      const sourceRecordIndex = convertedRecord
        ? sourceRecordIndexes.get(convertedRecord)
        : undefined
      const key =
        recordMatch && sourceRecordIndex !== undefined
          ? `altium_${recordMatch[1]}_${sourceRecordIndex}`
          : undefined
      const originalPour = key ? originalPoursByRecordKey.get(key) : undefined
      const pcbCopperPourId = originalPour?.pcb_copper_pour_id
      if (typeof pcbCopperPourId !== "string")
        throw new Error(`Missing source copper record ${element.pcb_copper_pour_id}`)
      const originalSettings = supportedPoursById.get(pcbCopperPourId)
      computedCopperPourSettingsById.set(pcbCopperPourId, {
        clearance: 0,
        preserveReferenceCopper: true,
        removableFeatureId: originalSettings?.removableFeatureId,
      })
      fixedPours.push({
        ...element,
        pcb_copper_pour_id: pcbCopperPourId,
        source_net_id: canonicalNet?.id,
      })
      return []
    }
    const polygon =
      polygonIndex === undefined ? undefined : params.pcbDocument.polygons[polygonIndex]
    if (!polygon || polygonIndex === undefined) return []
    if (!canonicalNet) return []
    const featureIds = featureIdsByPolygonIndex.get(polygonIndex)
    const removableFeatureId = featureIds?.size === 1 ? [...featureIds][0] : undefined
    const pcbCopperPourId = element.pcb_copper_pour_id.replace("altium_polygon", "authored")
    computedCopperPourSettingsById.set(pcbCopperPourId, {
      clearance: getSourcePourClearance({ polygon, pcbDocument: params.pcbDocument }),
      removableFeatureId,
    })
    recomputedPolygonIndexes.add(polygonIndex)
    return [
      {
        ...element,
        pcb_copper_pour_id: pcbCopperPourId,
        source_net_id: canonicalNet.id,
        pourOrder: polygon.pourIndex ?? polygonIndex,
      },
    ]
  })
  // Altium pours the lowest index first. Core gives later declarations priority.
  authoredPours.sort((first, second) => second.pourOrder - first.pourOrder)
  // Altium's object- and room-specific clearances cannot be expressed by one
  // margin. Retain the reference connections while computing additional fill.
  const referenceCopper = params.circuitJson.flatMap((element) => {
    if (element.type !== "pcb_copper_pour" || typeof element.pcb_copper_pour_id !== "string")
      return []
    if (typeof element.source_net_id !== "string") return []
    if (!/altium_region_\d+/u.test(element.pcb_copper_pour_id)) return []
    const polygonIndex = importedPolygonIndexByPourId.get(element.pcb_copper_pour_id)
    if (polygonIndex === undefined || !recomputedPolygonIndexes.has(polygonIndex)) return []
    const pcbCopperPourId = `reference_${element.pcb_copper_pour_id}`
    computedCopperPourSettingsById.set(pcbCopperPourId, {
      clearance: 0,
      preserveReferenceCopper: true,
      removableFeatureId: supportedPoursById.get(element.pcb_copper_pour_id)?.removableFeatureId,
    })
    return [{ ...element, pcb_copper_pour_id: pcbCopperPourId }]
  })
  return {
    circuitJson: [
      ...params.circuitJson.filter((element) => element.type !== "pcb_copper_pour"),
      ...authoredPours.map(({ pourOrder, ...element }) => element),
      ...referenceCopper,
      ...fixedPours,
    ],
    computedCopperPourSettingsById,
  }
}

function getSourceCopperRecordKey(
  pcbCopperPourId: PcbCopperPourId,
): SourceCopperRecordKey | undefined {
  return /altium_(?:region|fill)_\d+/u.exec(pcbCopperPourId)?.[0]
}
