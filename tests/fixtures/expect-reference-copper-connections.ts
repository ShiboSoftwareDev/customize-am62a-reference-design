import { expect } from "bun:test"
import { checkDanglingTraces } from "@tscircuit/checks"
import type { AnyCircuitElement } from "circuit-json"
import { getFullConnectivityMapFromCircuitJson } from "circuit-json-to-connectivity-map"

type SourceNetId = string
type NetName = string
type TraceEndpointKey = string

export function expectReferenceCopperConnections(params: {
  renderedCircuitJson: AnyCircuitElement[]
  sourceCircuitJson: AnyCircuitElement[]
}): void {
  const sourceNetNames = new Map<SourceNetId, NetName>()
  const renderedNetIds = new Map<NetName, SourceNetId>()
  for (const element of params.sourceCircuitJson) {
    if (
      element.type === "source_net" &&
      typeof element.name === "string" &&
      typeof element.source_net_id === "string"
    )
      sourceNetNames.set(element.source_net_id, element.name.trim().toUpperCase())
  }
  for (const element of params.renderedCircuitJson) {
    if (
      element.type === "source_net" &&
      typeof element.name === "string" &&
      typeof element.source_net_id === "string"
    )
      renderedNetIds.set(element.name.trim().toUpperCase(), element.source_net_id)
  }
  const sourceCopper = params.sourceCircuitJson.flatMap((element) => {
    if (element.type !== "pcb_copper_pour" || typeof element.source_net_id !== "string") return []
    // A converter fallback for an unfilled Altium polygon is pour intent,
    // not proof of an existing physical contact. Compare filled source copper.
    if (
      typeof element.pcb_copper_pour_id === "string" &&
      /_altium_polygon_\d+/u.test(element.pcb_copper_pour_id)
    )
      return []
    const netName = sourceNetNames.get(element.source_net_id)
    const renderedNetId = netName ? renderedNetIds.get(netName) : undefined
    return renderedNetId ? [{ ...element, source_net_id: renderedNetId }] : []
  })
  // Keep the same runtime IDs and routes on both sides. Only copper geometry
  // changes, so a new dangling endpoint identifies a lost reference contact.
  const withReferenceCopper = [
    ...params.renderedCircuitJson.filter((element) => element.type !== "pcb_copper_pour"),
    ...sourceCopper,
  ]
  const referenceEndpoints = getDanglingEndpointKeys(withReferenceCopper)
  const recomputedEndpoints = getDanglingEndpointKeys(params.renderedCircuitJson)
  expect([...recomputedEndpoints].filter((endpoint) => !referenceEndpoints.has(endpoint))).toEqual(
    [],
  )
}

function getDanglingEndpointKeys(circuitJson: AnyCircuitElement[]): Set<TraceEndpointKey> {
  const connectedTraces = circuitJson.filter(
    (element) => element.type !== "pcb_trace" || typeof element.source_trace_id === "string",
  )
  return new Set(
    checkDanglingTraces(connectedTraces, {
      connMap: getFullConnectivityMapFromCircuitJson(connectedTraces),
    }).map((error) =>
      JSON.stringify([
        error.pcb_trace_id,
        Math.round(error.center.x * 1e6) / 1e6,
        Math.round(error.center.y * 1e6) / 1e6,
      ]),
    ),
  )
}
