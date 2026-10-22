import type { AnyCircuitElement } from "circuit-json"
import { getFeatureIdBySourceComponentId } from "./get-feature-id-by-source-component-id"
import {
  type GeneratedSourceNetId,
  getImportedRoutingInclusionMasks,
  getPcbViaKey,
  type ImportedRoutingInclusionMask,
  type PcbTraceRouteKey,
  type PcbViaKey,
} from "./get-imported-routing-inclusion-masks"
import type { ComponentName, FeatureId } from "./types"

type SourceNetId = string
type SourceTraceId = string

type SourceNetElement = AnyCircuitElement & {
  source_net_id: SourceNetId
  type: "source_net"
}

type SourceTraceElement = AnyCircuitElement & {
  connected_source_net_ids?: SourceNetId[]
  source_trace_id: SourceTraceId
  type: "source_trace"
}

type PcbTraceElement = AnyCircuitElement & {
  route: unknown[]
  source_trace_id: SourceTraceId | SourceNetId
  type: "pcb_trace"
}

type PcbViaElement = AnyCircuitElement & {
  source_net_id?: SourceNetId
  source_trace_id?: SourceTraceId
  type: "pcb_via"
  x: number
  y: number
}

export type ImportedPcbTraceMetadata = {
  inclusionMask: ImportedRoutingInclusionMask
  sourceNetId: GeneratedSourceNetId
}

export type ImportedPcbViaMetadata = {
  inclusionMask: ImportedRoutingInclusionMask
  sourceNetId: GeneratedSourceNetId
}

export type ImportedRoutingBridgeViaMetadata = ImportedPcbViaMetadata & {
  holeDiameter: number
  outerDiameter: number
  x: number
  y: number
}

export type ImportedRoutingMetadata = {
  bridgeVias: ImportedRoutingBridgeViaMetadata[]
  featureIds: FeatureId[]
  pcbTraceMetadataByRoute: ReadonlyMap<PcbTraceRouteKey, ImportedPcbTraceMetadata>
  sourceNetIdsWithImportedRouting: ReadonlySet<GeneratedSourceNetId>
  supportedRemovalCombinationIndexes: number[]
  viaMetadataByKey: ReadonlyMap<PcbViaKey, ImportedPcbViaMetadata>
}

export function getImportedRoutingMetadata(params: {
  circuitJson: AnyCircuitElement[]
  featureIdByComponentName: ReadonlyMap<ComponentName, FeatureId>
  removedFeatureIdCombinations: FeatureId[][]
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
  const sourceNetIdBySourceTraceId = new Map<SourceTraceId, SourceNetId>(
    [...sourceTracesById.values()].flatMap((sourceTrace) => {
      const sourceNetId = sourceTrace.connected_source_net_ids?.[0]
      return sourceNetId ? [[sourceTrace.source_trace_id, sourceNetId]] : []
    }),
  )
  const featureIdBySourceComponentId = getFeatureIdBySourceComponentId({
    circuitJson: params.circuitJson,
    featureIdByComponentName: params.featureIdByComponentName,
  })
  const inclusionMasks = getImportedRoutingInclusionMasks({
    circuitJson: params.circuitJson,
    featureIdBySourceComponentId,
    generatedSourceNetIdBySourceNetId,
    removedFeatureIdCombinations: params.removedFeatureIdCombinations,
    sourceNetIdBySourceTraceId,
  })
  const pcbTraceMetadataByRoute = new Map<PcbTraceRouteKey, ImportedPcbTraceMetadata>()
  const viaMetadataByKey = new Map<PcbViaKey, ImportedPcbViaMetadata>()

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
    pcbTraceMetadataByRoute.set(routeKey, {
      inclusionMask: inclusionMasks.traceInclusionMaskByRouteKey.get(routeKey) ?? 1n,
      sourceNetId: generatedSourceNetId,
    })
  }

  for (const pcbVia of params.circuitJson.filter(isPcbVia)) {
    const sourceNetId = getViaSourceNetId({ pcbVia, sourceTracesById })
    const generatedSourceNetId = sourceNetId
      ? generatedSourceNetIdBySourceNetId.get(sourceNetId)
      : undefined
    if (!generatedSourceNetId) continue
    const viaKey = getPcbViaKey({
      sourceNetId: generatedSourceNetId,
      x: pcbVia.x,
      y: pcbVia.y,
    })
    viaMetadataByKey.set(viaKey, {
      inclusionMask: inclusionMasks.viaInclusionMaskByViaKey.get(viaKey) ?? 1n,
      sourceNetId: generatedSourceNetId,
    })
  }

  return {
    bridgeVias: [...inclusionMasks.bridgeViaByViaKey].flatMap(([viaKey, bridgeVia]) => {
      const generatedSourceNetId = generatedSourceNetIdBySourceNetId.get(bridgeVia.sourceNetId)
      const inclusionMask = inclusionMasks.bridgeViaInclusionMaskByViaKey.get(viaKey)
      return generatedSourceNetId && inclusionMask !== undefined
        ? [
            {
              holeDiameter: bridgeVia.holeDiameter,
              inclusionMask,
              outerDiameter: bridgeVia.outerDiameter,
              sourceNetId: generatedSourceNetId,
              x: bridgeVia.x,
              y: bridgeVia.y,
            },
          ]
        : []
    }),
    featureIds: inclusionMasks.featureIds,
    pcbTraceMetadataByRoute,
    sourceNetIdsWithImportedRouting: new Set(
      [...pcbTraceMetadataByRoute.values()].map(({ sourceNetId }) => sourceNetId),
    ),
    supportedRemovalCombinationIndexes: inclusionMasks.supportedRemovalCombinationIndexes,
    viaMetadataByKey,
  }
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

function getViaSourceNetId(params: {
  pcbVia: PcbViaElement
  sourceTracesById: ReadonlyMap<SourceTraceId, SourceTraceElement>
}): SourceNetId | undefined {
  if (params.pcbVia.source_net_id) return params.pcbVia.source_net_id
  return params.pcbVia.source_trace_id
    ? params.sourceTracesById.get(params.pcbVia.source_trace_id)?.connected_source_net_ids?.[0]
    : undefined
}

function isSourceNet(element: AnyCircuitElement): element is SourceNetElement {
  return element.type === "source_net" && typeof element.source_net_id === "string"
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

function isPcbVia(element: AnyCircuitElement): element is PcbViaElement {
  return (
    element.type === "pcb_via" && typeof element.x === "number" && typeof element.y === "number"
  )
}
