import { copperPolygonsTouch, getPourPolygon, getViaPolygon } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement } from "circuit-json"
import type { ImportedPcbVia, PcbViaId } from "./get-included-imported-routing-element-ids"

type SourceNetId = string
type SourceTraceId = string
type PcbLayerName = string
type PcbCopperPourId = string
type CopperPolygon = ReturnType<typeof getPourPolygon>

type CopperPourContact = {
  id: PcbCopperPourId
  layer: PcbLayerName
}

type IndexedPour = CopperPourContact & {
  bounds: CopperPolygon["box"]
  polygon: CopperPolygon
}

type CopperPourContactsByViaId = ReadonlyMap<PcbViaId, CopperPourContact[]>

export function getCopperPourContacts({
  circuitJson,
  pcbVias,
}: {
  circuitJson: AnyCircuitElement[]
  pcbVias: ImportedPcbVia[]
}): CopperPourContactsByViaId {
  const poursByNet = new Map<SourceNetId, IndexedPour[]>()
  const netByTrace = new Map<SourceTraceId, SourceNetId>()
  for (const element of circuitJson) {
    if (
      element.type === "source_trace" &&
      typeof element.source_trace_id === "string" &&
      Array.isArray(element.connected_source_net_ids) &&
      element.connected_source_net_ids.length === 1 &&
      typeof element.connected_source_net_ids[0] === "string"
    ) {
      netByTrace.set(element.source_trace_id, element.connected_source_net_ids[0])
    }
    if (
      element.type !== "pcb_copper_pour" ||
      typeof element.source_net_id !== "string" ||
      typeof element.pcb_copper_pour_id !== "string" ||
      typeof element.layer !== "string"
    ) {
      continue
    }
    const polygon = getPourPolygon(element as Parameters<typeof getPourPolygon>[0])
    if (polygon.isEmpty()) continue
    const pours = poursByNet.get(element.source_net_id) ?? []
    pours.push({
      id: element.pcb_copper_pour_id,
      layer: element.layer,
      bounds: polygon.box,
      polygon,
    })
    poursByNet.set(element.source_net_id, pours)
  }

  const contacts = new Map<PcbViaId, CopperPourContact[]>()
  for (const via of pcbVias) {
    const sourceNetId = via.source_net_id ?? netByTrace.get(via.source_trace_id ?? "")
    const pours = sourceNetId ? poursByNet.get(sourceNetId) : undefined
    if (!pours || !via.outer_diameter || via.hole_diameter === undefined) continue
    const viaPolygon = getViaPolygon(via, via.outer_diameter, via.hole_diameter)
    const viaBounds = viaPolygon.box
    const touchedPours = pours.filter(
      ({ layer, bounds, polygon }) =>
        via.layers?.includes(layer) &&
        viaBounds.intersect(bounds) &&
        copperPolygonsTouch(viaPolygon, polygon),
    )
    if (touchedPours.length > 0)
      contacts.set(
        via.pcb_via_id,
        touchedPours.map(({ id, layer }) => ({ id, layer })),
      )
  }
  return contacts
}
