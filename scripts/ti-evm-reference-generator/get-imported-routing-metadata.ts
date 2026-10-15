import type { AnyCircuitElement } from "circuit-json"
import type { ComponentName, FeatureId, SourceComponentId, SourcePortId } from "./types"

export type PcbTraceRouteKey = string
type GeneratedSourceNetId = string
type SourceNetId = string
type SourceTraceId = string

type SourceNetElement = AnyCircuitElement & {
  source_net_id: SourceNetId
  type: "source_net"
}

type SourceTraceElement = AnyCircuitElement & {
  connected_source_net_ids?: SourceNetId[]
  connected_source_port_ids?: SourcePortId[]
  source_trace_id: SourceTraceId
  type: "source_trace"
}

type SourceComponentElement = AnyCircuitElement & {
  name: ComponentName
  source_component_id: SourceComponentId
  type: "source_component"
}

type SourcePortElement = AnyCircuitElement & {
  source_component_id: SourceComponentId
  source_port_id: SourcePortId
  type: "source_port"
}

type PcbTraceElement = AnyCircuitElement & {
  route: unknown[]
  source_trace_id: SourceTraceId | SourceNetId
  type: "pcb_trace"
}

export type ImportedPcbTraceMetadata = {
  sourceNetId: GeneratedSourceNetId
}

export type ImportedRoutingEndpointUsage = {
  endpointCountByFeatureId: ReadonlyMap<FeatureId, number>
  requiredEndpointCount: number
}

type MutableImportedRoutingEndpointUsage = {
  endpointCountByFeatureId: Map<FeatureId, number>
  requiredEndpointCount: number
}

export type ImportedRoutingMetadata = {
  endpointUsageBySourceNetId: ReadonlyMap<GeneratedSourceNetId, ImportedRoutingEndpointUsage>
  pcbTraceMetadataByRoute: ReadonlyMap<PcbTraceRouteKey, ImportedPcbTraceMetadata>
  sourceNetIdsWithImportedRouting: ReadonlySet<GeneratedSourceNetId>
}

export function getImportedRoutingMetadata(params: {
  circuitJson: AnyCircuitElement[]
  featureIdByComponentName: ReadonlyMap<ComponentName, FeatureId>
}): ImportedRoutingMetadata {
  const sourceNetsById = new Map<SourceNetId, SourceNetElement>(
    params.circuitJson.filter(isSourceNet).map((net) => [net.source_net_id, net]),
  )
  const sourceTracesById = new Map<SourceTraceId, SourceTraceElement>(
    params.circuitJson.filter(isSourceTrace).map((trace) => [trace.source_trace_id, trace]),
  )
  const generatedSourceNetIdBySourceNetId = getGeneratedSourceNetIds({
    circuitJson: params.circuitJson,
    sourceNetsById,
  })
  const endpointUsageBySourceNetId = getEndpointUsageBySourceNetId({
    circuitJson: params.circuitJson,
    featureIdByComponentName: params.featureIdByComponentName,
    generatedSourceNetIdBySourceNetId,
  })
  const pcbTraceMetadataByRoute = new Map<PcbTraceRouteKey, ImportedPcbTraceMetadata>()

  for (const pcbTrace of params.circuitJson.filter(isPcbTrace)) {
    const sourceNetId = getSourceNetId({ pcbTrace, sourceTracesById })
    const generatedSourceNetId = sourceNetId
      ? generatedSourceNetIdBySourceNetId.get(sourceNetId)
      : undefined
    if (!generatedSourceNetId) continue
    const routeKey = JSON.stringify(pcbTrace.route)
    const existingMetadata = pcbTraceMetadataByRoute.get(routeKey)
    if (existingMetadata && existingMetadata.sourceNetId !== generatedSourceNetId) {
      throw new Error(
        `Imported PCB route belongs to both ${existingMetadata.sourceNetId} and ${generatedSourceNetId}`,
      )
    }
    pcbTraceMetadataByRoute.set(routeKey, { sourceNetId: generatedSourceNetId })
  }

  return {
    endpointUsageBySourceNetId,
    pcbTraceMetadataByRoute,
    sourceNetIdsWithImportedRouting: new Set(
      [...pcbTraceMetadataByRoute.values()].map(({ sourceNetId }) => sourceNetId),
    ),
  }
}

function getEndpointUsageBySourceNetId(params: {
  circuitJson: AnyCircuitElement[]
  featureIdByComponentName: ReadonlyMap<ComponentName, FeatureId>
  generatedSourceNetIdBySourceNetId: ReadonlyMap<SourceNetId, GeneratedSourceNetId>
}): Map<GeneratedSourceNetId, ImportedRoutingEndpointUsage> {
  const sourceComponentsById = new Map<SourceComponentId, SourceComponentElement>(
    params.circuitJson
      .filter(isSourceComponent)
      .map((component) => [component.source_component_id, component]),
  )
  const sourcePortsById = new Map<SourcePortId, SourcePortElement>(
    params.circuitJson.filter(isSourcePort).map((port) => [port.source_port_id, port]),
  )
  const endpointUsageBySourceNetId = new Map<
    GeneratedSourceNetId,
    MutableImportedRoutingEndpointUsage
  >()

  for (const sourceTrace of params.circuitJson.filter(isSourceTrace)) {
    for (const sourceNetId of sourceTrace.connected_source_net_ids ?? []) {
      const generatedSourceNetId = params.generatedSourceNetIdBySourceNetId.get(sourceNetId)
      if (!generatedSourceNetId) continue
      const endpointUsage = endpointUsageBySourceNetId.get(generatedSourceNetId) ?? {
        endpointCountByFeatureId: new Map<FeatureId, number>(),
        requiredEndpointCount: 0,
      }
      for (const sourcePortId of sourceTrace.connected_source_port_ids ?? []) {
        const sourcePort = sourcePortsById.get(sourcePortId)
        const componentName = sourcePort
          ? sourceComponentsById.get(sourcePort.source_component_id)?.name
          : undefined
        const featureId = componentName
          ? params.featureIdByComponentName.get(componentName)
          : undefined
        if (!featureId) {
          endpointUsage.requiredEndpointCount += 1
          continue
        }
        const currentEndpointCount = endpointUsage.endpointCountByFeatureId.get(featureId) ?? 0
        endpointUsage.endpointCountByFeatureId.set(featureId, currentEndpointCount + 1)
      }
      endpointUsageBySourceNetId.set(generatedSourceNetId, endpointUsage)
    }
  }

  return endpointUsageBySourceNetId
}

function getGeneratedSourceNetIds(params: {
  circuitJson: AnyCircuitElement[]
  sourceNetsById: ReadonlyMap<SourceNetId, SourceNetElement>
}): Map<SourceNetId, GeneratedSourceNetId> {
  const canonicalSourceNetIdBySourceNetId = getCanonicalSourceNetIds({
    circuitJson: params.circuitJson,
    sourceNetsById: params.sourceNetsById,
  })
  const orderedCanonicalSourceNetIds: SourceNetId[] = []
  const addedCanonicalSourceNetIds = new Set<SourceNetId>()
  for (const sourceTrace of params.circuitJson.filter(isSourceTrace)) {
    for (const sourceNetId of sourceTrace.connected_source_net_ids ?? []) {
      addCanonicalSourceNetId({
        addedCanonicalSourceNetIds,
        canonicalSourceNetIdBySourceNetId,
        orderedCanonicalSourceNetIds,
        sourceNetId,
      })
    }
  }
  for (const sourceNetId of params.sourceNetsById.keys()) {
    addCanonicalSourceNetId({
      addedCanonicalSourceNetIds,
      canonicalSourceNetIdBySourceNetId,
      orderedCanonicalSourceNetIds,
      sourceNetId,
    })
  }

  const generatedSourceNetIdByCanonicalId = new Map<SourceNetId, GeneratedSourceNetId>(
    orderedCanonicalSourceNetIds.map((sourceNetId, sourceNetIndex) => [
      sourceNetId,
      `source_net_${sourceNetIndex}`,
    ]),
  )
  return new Map(
    [...params.sourceNetsById.keys()].map((sourceNetId) => {
      const canonicalSourceNetId = canonicalSourceNetIdBySourceNetId.get(sourceNetId) ?? sourceNetId
      const generatedSourceNetId = generatedSourceNetIdByCanonicalId.get(canonicalSourceNetId)
      if (!generatedSourceNetId) {
        throw new Error(`Source net ${sourceNetId} has no generated source net ID`)
      }
      return [sourceNetId, generatedSourceNetId]
    }),
  )
}

function addCanonicalSourceNetId(params: {
  addedCanonicalSourceNetIds: Set<SourceNetId>
  canonicalSourceNetIdBySourceNetId: ReadonlyMap<SourceNetId, SourceNetId>
  orderedCanonicalSourceNetIds: SourceNetId[]
  sourceNetId: SourceNetId
}): void {
  const canonicalSourceNetId =
    params.canonicalSourceNetIdBySourceNetId.get(params.sourceNetId) ?? params.sourceNetId
  if (params.addedCanonicalSourceNetIds.has(canonicalSourceNetId)) return
  params.orderedCanonicalSourceNetIds.push(canonicalSourceNetId)
  params.addedCanonicalSourceNetIds.add(canonicalSourceNetId)
}

function getCanonicalSourceNetIds(params: {
  circuitJson: AnyCircuitElement[]
  sourceNetsById: ReadonlyMap<SourceNetId, SourceNetElement>
}): Map<SourceNetId, SourceNetId> {
  const parentSourceNetIdBySourceNetId = new Map<SourceNetId, SourceNetId>(
    [...params.sourceNetsById.keys()].map((sourceNetId) => [sourceNetId, sourceNetId]),
  )
  for (const sourceTrace of params.circuitJson.filter(isSourceTrace)) {
    const sourceNetIds = (sourceTrace.connected_source_net_ids ?? []).filter((sourceNetId) =>
      parentSourceNetIdBySourceNetId.has(sourceNetId),
    )
    const firstSourceNetId = sourceNetIds[0]
    if (!firstSourceNetId) continue
    const canonicalSourceNetId = findCanonicalSourceNetId({
      parentSourceNetIdBySourceNetId,
      sourceNetId: firstSourceNetId,
    })
    for (const sourceNetId of sourceNetIds.slice(1)) {
      const aliasCanonicalSourceNetId = findCanonicalSourceNetId({
        parentSourceNetIdBySourceNetId,
        sourceNetId,
      })
      if (aliasCanonicalSourceNetId !== canonicalSourceNetId) {
        parentSourceNetIdBySourceNetId.set(aliasCanonicalSourceNetId, canonicalSourceNetId)
      }
    }
  }
  return new Map(
    [...parentSourceNetIdBySourceNetId.keys()].map((sourceNetId) => [
      sourceNetId,
      findCanonicalSourceNetId({ parentSourceNetIdBySourceNetId, sourceNetId }),
    ]),
  )
}

function findCanonicalSourceNetId(params: {
  parentSourceNetIdBySourceNetId: ReadonlyMap<SourceNetId, SourceNetId>
  sourceNetId: SourceNetId
}): SourceNetId {
  let currentSourceNetId = params.sourceNetId
  const visitedSourceNetIds = new Set<SourceNetId>()
  while (!visitedSourceNetIds.has(currentSourceNetId)) {
    visitedSourceNetIds.add(currentSourceNetId)
    const parentSourceNetId = params.parentSourceNetIdBySourceNetId.get(currentSourceNetId)
    if (!parentSourceNetId || parentSourceNetId === currentSourceNetId) return currentSourceNetId
    currentSourceNetId = parentSourceNetId
  }
  return currentSourceNetId
}

function getSourceNetId(params: {
  pcbTrace: PcbTraceElement
  sourceTracesById: ReadonlyMap<SourceTraceId, SourceTraceElement>
}): SourceNetId | undefined {
  return (
    params.sourceTracesById.get(params.pcbTrace.source_trace_id)?.connected_source_net_ids?.[0] ??
    (params.pcbTrace.source_trace_id.startsWith("source_net_")
      ? params.pcbTrace.source_trace_id
      : undefined)
  )
}

function isSourceNet(element: AnyCircuitElement): element is SourceNetElement {
  return element.type === "source_net" && typeof element.source_net_id === "string"
}

function isSourceComponent(element: AnyCircuitElement): element is SourceComponentElement {
  return (
    element.type === "source_component" &&
    typeof element.source_component_id === "string" &&
    typeof element.name === "string"
  )
}

function isSourcePort(element: AnyCircuitElement): element is SourcePortElement {
  return (
    element.type === "source_port" &&
    typeof element.source_component_id === "string" &&
    typeof element.source_port_id === "string"
  )
}

function isSourceTrace(element: AnyCircuitElement): element is SourceTraceElement {
  return element.type === "source_trace" && typeof element.source_trace_id === "string"
}

function isPcbTrace(element: AnyCircuitElement): element is PcbTraceElement {
  return (
    element.type === "pcb_trace" &&
    typeof element.source_trace_id === "string" &&
    Array.isArray(element.route)
  )
}
