import {
  type AltiumPadRecord,
  AltiumRegionRecord,
  AltiumViaRecord,
  getAltiumPcbPadGeometry,
  type parseAltiumBinaryPcbDoc,
} from "altiumts"
import { applyToPoint, rotateDEG } from "transformation-matrix"
import { nearlyEqual } from "./geometry"
import { getPinKey } from "./pads"
import type {
  ComponentNameByRecordIndex,
  NetRecordIndex,
  PinKeysByComponentRecordIndex,
} from "./types"

const TEARDROP_CONTACT_TOLERANCE_MILS = 0.1

export type TeardropConnections = {
  endpointKeys: Set<string>
  hasViaTeardrops: boolean
}

type PadRecordsByNetIndex = Map<NetRecordIndex, AltiumPadRecord[]>
type ViaRecordsByNetIndex = Map<NetRecordIndex, AltiumViaRecord[]>

export function getTeardropsByNet(params: {
  pcbDocument: ReturnType<typeof parseAltiumBinaryPcbDoc>
  padRecords: AltiumPadRecord[]
  componentNames: ComponentNameByRecordIndex
  componentPinKeys: PinKeysByComponentRecordIndex
}): Map<NetRecordIndex, TeardropConnections> {
  const teardropsByNet = new Map<NetRecordIndex, TeardropConnections>()
  const viaRecords = (params.pcbDocument.primitiveRecords.get("Vias6") ?? []).filter(
    (record): record is AltiumViaRecord => record instanceof AltiumViaRecord,
  )
  const teardropRegions = (
    params.pcbDocument.primitiveRecords.get("ShapeBasedRegions6") ?? []
  ).filter(
    (record): record is AltiumRegionRecord =>
      record instanceof AltiumRegionRecord && record.getBoolean("TEARDROP") === true,
  )
  const padRecordsByNetIndex = groupPadsByNetIndex(params.padRecords)
  const viaRecordsByNetIndex = groupViasByNetIndex(viaRecords)

  for (const region of teardropRegions) {
    const netIndex = region.netIndex
    if (netIndex === undefined) continue
    const outlinePoints = region.geometry.outline.points
    const netPadRecords = padRecordsByNetIndex.get(netIndex) ?? []
    const netViaRecords = viaRecordsByNetIndex.get(netIndex) ?? []
    const padContacts = netPadRecords.filter(
      (padRecord) =>
        isPadOnRegionLayer({ padRecord, regionLayer: region.layer }) &&
        outlinePoints.some((point) => isPointOnPad({ point, padRecord })),
    )
    const viaContacts = netViaRecords.filter((viaRecord) => {
      const position = viaRecord.position
      return (
        position !== undefined &&
        outlinePoints.some(
          (point) =>
            Math.hypot(point.x - position.x, point.y - position.y) <=
            (viaRecord.diameterMils ?? 0) / 2 + TEARDROP_CONTACT_TOLERANCE_MILS,
        )
      )
    })
    const contacts =
      padContacts.length > 0 || viaContacts.length > 0
        ? { padContacts, viaContacts }
        : getNearestTeardropContact({
            region,
            padRecords: netPadRecords,
            viaRecords: netViaRecords,
          })
    const teardrops = teardropsByNet.get(netIndex) ?? {
      endpointKeys: new Set<string>(),
      hasViaTeardrops: false,
    }

    for (const padRecord of contacts.padContacts) {
      const componentIndex = padRecord.componentIndex
      if (componentIndex === undefined) continue
      const componentName = params.componentNames.get(componentIndex)
      const pinKeys = params.componentPinKeys.get(componentIndex)
      const pinKey = pinKeys && getPinKey({ padRecord, pinKeys })
      if (componentName && pinKey) teardrops.endpointKeys.add(`${componentName}.${pinKey}`)
    }
    if (contacts.viaContacts.length > 0) teardrops.hasViaTeardrops = true
    teardropsByNet.set(netIndex, teardrops)
  }

  return teardropsByNet
}

function groupPadsByNetIndex(padRecords: AltiumPadRecord[]): PadRecordsByNetIndex {
  const padRecordsByNetIndex: PadRecordsByNetIndex = new Map()
  for (const padRecord of padRecords) {
    const netIndex = padRecord.netIndex
    if (netIndex === undefined) continue
    const netPadRecords = padRecordsByNetIndex.get(netIndex) ?? []
    netPadRecords.push(padRecord)
    padRecordsByNetIndex.set(netIndex, netPadRecords)
  }
  return padRecordsByNetIndex
}

function groupViasByNetIndex(viaRecords: AltiumViaRecord[]): ViaRecordsByNetIndex {
  const viaRecordsByNetIndex: ViaRecordsByNetIndex = new Map()
  for (const viaRecord of viaRecords) {
    const netIndex = viaRecord.netIndex
    if (netIndex === undefined) continue
    const netViaRecords = viaRecordsByNetIndex.get(netIndex) ?? []
    netViaRecords.push(viaRecord)
    viaRecordsByNetIndex.set(netIndex, netViaRecords)
  }
  return viaRecordsByNetIndex
}

function isPadOnRegionLayer(params: { padRecord: AltiumPadRecord; regionLayer?: string }): boolean {
  const padLayer = params.padRecord.layer?.toUpperCase()
  const normalizedRegionLayer = params.regionLayer?.toUpperCase()
  return padLayer === "MULTILAYER" || padLayer === normalizedRegionLayer
}

function isPointOnPad(params: {
  point: { x: number; y: number }
  padRecord: AltiumPadRecord
}): boolean {
  const geometry = getAltiumPcbPadGeometry({ record: params.padRecord })
  const localPoint = applyToPoint(rotateDEG(-geometry.ccwRotationDegrees), {
    x: params.point.x - geometry.xMils,
    y: params.point.y - geometry.yMils,
  })
  if (geometry.shape === "ROUND" && nearlyEqual(geometry.widthMils, geometry.heightMils)) {
    return (
      Math.hypot(localPoint.x, localPoint.y) <=
      geometry.widthMils / 2 + TEARDROP_CONTACT_TOLERANCE_MILS
    )
  }
  return (
    Math.abs(localPoint.x) <= geometry.widthMils / 2 + TEARDROP_CONTACT_TOLERANCE_MILS &&
    Math.abs(localPoint.y) <= geometry.heightMils / 2 + TEARDROP_CONTACT_TOLERANCE_MILS
  )
}

function getNearestTeardropContact(params: {
  region: AltiumRegionRecord
  padRecords: AltiumPadRecord[]
  viaRecords: AltiumViaRecord[]
}): { padContacts: AltiumPadRecord[]; viaContacts: AltiumViaRecord[] } {
  const netIndex = params.region.netIndex
  const outlinePoints = params.region.geometry.outline.points
  const candidates = [
    ...params.padRecords.flatMap((padRecord) => {
      const position = padRecord.position
      if (
        padRecord.netIndex !== netIndex ||
        position === undefined ||
        !isPadOnRegionLayer({ padRecord, regionLayer: params.region.layer })
      ) {
        return []
      }
      return [{ kind: "pad" as const, record: padRecord, position }]
    }),
    ...params.viaRecords.flatMap((viaRecord) => {
      const position = viaRecord.position
      if (viaRecord.netIndex !== netIndex || position === undefined) return []
      return [{ kind: "via" as const, record: viaRecord, position }]
    }),
  ]
  const nearestContact = candidates
    .map((candidate) => ({
      ...candidate,
      distance: Math.min(
        ...outlinePoints.map((point) =>
          Math.hypot(point.x - candidate.position.x, point.y - candidate.position.y),
        ),
      ),
    }))
    .sort((first, second) => first.distance - second.distance)[0]

  return {
    padContacts: nearestContact?.kind === "pad" ? [nearestContact.record] : [],
    viaContacts: nearestContact?.kind === "via" ? [nearestContact.record] : [],
  }
}
