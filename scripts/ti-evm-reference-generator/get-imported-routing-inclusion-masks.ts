import type { AnyCircuitElement } from "circuit-json"
import { getFullConnectivityMapFromCircuitJson } from "circuit-json-to-connectivity-map"
import {
  getBaselineDanglingEndpointKeys,
  getIncidentPcbTraceIdsByViaId,
  getImportedPcbTraces,
  getImportedPcbVias,
  getIncludedImportedRoutingElementIds,
} from "./get-included-imported-routing-element-ids"
import type { ImportedRoutingBridgeVia } from "./get-imported-routing-bridge-vias"
import type { ImportedPcbVia } from "./get-included-imported-routing-element-ids"
import type { FeatureId, SourceComponentId } from "./types"

export type GeneratedSourceNetId = string
export type ImportedRoutingInclusionMask = bigint
export type PcbTraceRouteKey = string
export type PcbViaKey = string
type SourceNetId = string
type SourceTraceId = string

export type ImportedRoutingInclusionMasks = {
  bridgeViaInclusionMaskByViaKey: ReadonlyMap<PcbViaKey, ImportedRoutingInclusionMask>
  bridgeViaByViaKey: ReadonlyMap<PcbViaKey, ImportedRoutingBridgeVia>
  featureIds: FeatureId[]
  supportedRemovalCombinationIndexes: number[]
  traceInclusionMaskByRouteKey: ReadonlyMap<PcbTraceRouteKey, ImportedRoutingInclusionMask>
  viaInclusionMaskByViaKey: ReadonlyMap<PcbViaKey, ImportedRoutingInclusionMask>
}

export function getImportedRoutingInclusionMasks(params: {
  circuitJson: AnyCircuitElement[]
  featureIdBySourceComponentId: ReadonlyMap<SourceComponentId, FeatureId>
  generatedSourceNetIdBySourceNetId: ReadonlyMap<SourceNetId, GeneratedSourceNetId>
  removedFeatureIdCombinations: FeatureId[][]
  sourceNetIdBySourceTraceId: ReadonlyMap<SourceTraceId, SourceNetId>
}): ImportedRoutingInclusionMasks {
  const featureIds = [...new Set(params.featureIdBySourceComponentId.values())]
  const pcbTraces = getImportedPcbTraces(params.circuitJson)
  const pcbVias = getImportedPcbVias(params.circuitJson)
  const connectivityMap = getFullConnectivityMapFromCircuitJson(params.circuitJson)
  const incidentPcbTraceIdsByViaId = getIncidentPcbTraceIdsByViaId({
    pcbTraces,
    pcbVias,
  })
  const baselineDanglingEndpointKeys = getBaselineDanglingEndpointKeys(
    params.circuitJson,
    connectivityMap,
  )
  const traceInclusionMaskByRouteKey = new Map<PcbTraceRouteKey, ImportedRoutingInclusionMask>()
  const viaInclusionMaskByViaKey = new Map<PcbViaKey, ImportedRoutingInclusionMask>()
  const bridgeViaInclusionMaskByViaKey = new Map<PcbViaKey, ImportedRoutingInclusionMask>()
  const bridgeViaByViaKey = new Map<PcbViaKey, ImportedRoutingBridgeVia>()
  const knownFeatureIds = new Set(featureIds)
  for (const removedFeatureIds of params.removedFeatureIdCombinations) {
    for (const removedFeatureId of removedFeatureIds) {
      if (!knownFeatureIds.has(removedFeatureId)) {
        throw new Error(`Unknown imported-routing feature: ${removedFeatureId}`)
      }
    }
  }
  const supportedRemovalCombinationIndexes = [
    ...new Set(
      params.removedFeatureIdCombinations.map((removedFeatureIds) =>
        getRemovalCombinationIndex({
          featureIds,
          removedFeatureIds: new Set(removedFeatureIds),
        }),
      ),
    ),
  ]

  for (const removalCombinationIndex of supportedRemovalCombinationIndexes) {
    console.log(`Imported routing: evaluating combination ${removalCombinationIndex}`)
    const removedFeatureIds = getRemovedFeatureIds({
      featureIds,
      removalCombinationIndex,
    })
    const removedSourceComponentIds = new Set<SourceComponentId>(
      [...params.featureIdBySourceComponentId].flatMap(([sourceComponentId, featureId]) =>
        removedFeatureIds.has(featureId) ? [sourceComponentId] : [],
      ),
    )
    const { includedBridgeVias, includedPcbTraceIds, includedPcbViaIds } =
      getIncludedImportedRoutingElementIds({
        baselineDanglingEndpointKeys,
        circuitJson: params.circuitJson,
        connectivityMap,
        incidentPcbTraceIdsByViaId,
        pcbTraces,
        pcbVias,
        removedSourceComponentIds,
      })
    const inclusionBit = 1n << BigInt(removalCombinationIndex)

    for (const pcbTrace of pcbTraces) {
      if (!includedPcbTraceIds.has(pcbTrace.pcb_trace_id)) continue
      const routeKey = JSON.stringify(pcbTrace.route)
      traceInclusionMaskByRouteKey.set(
        routeKey,
        (traceInclusionMaskByRouteKey.get(routeKey) ?? 0n) | inclusionBit,
      )
    }

    for (const pcbVia of pcbVias) {
      if (!includedPcbViaIds.has(pcbVia.pcb_via_id)) continue
      const viaKey = getPcbViaKeyForElement({
        generatedSourceNetIdBySourceNetId: params.generatedSourceNetIdBySourceNetId,
        pcbVia,
        sourceNetIdBySourceTraceId: params.sourceNetIdBySourceTraceId,
      })
      if (!viaKey) continue
      viaInclusionMaskByViaKey.set(
        viaKey,
        (viaInclusionMaskByViaKey.get(viaKey) ?? 0n) | inclusionBit,
      )
    }

    for (const bridgeVia of includedBridgeVias) {
      const generatedSourceNetId = params.generatedSourceNetIdBySourceNetId.get(
        bridgeVia.sourceNetId,
      )
      if (!generatedSourceNetId) continue
      const viaKey = getPcbViaKey({
        sourceNetId: generatedSourceNetId,
        x: bridgeVia.x,
        y: bridgeVia.y,
      })
      bridgeViaByViaKey.set(viaKey, bridgeVia)
      bridgeViaInclusionMaskByViaKey.set(
        viaKey,
        (bridgeViaInclusionMaskByViaKey.get(viaKey) ?? 0n) | inclusionBit,
      )
    }
  }

  return {
    bridgeViaByViaKey,
    bridgeViaInclusionMaskByViaKey,
    featureIds,
    supportedRemovalCombinationIndexes,
    traceInclusionMaskByRouteKey,
    viaInclusionMaskByViaKey,
  }
}

function getRemovalCombinationIndex(params: {
  featureIds: FeatureId[]
  removedFeatureIds: ReadonlySet<FeatureId>
}): number {
  let removalCombinationIndex = 0
  for (const [featureIndex, featureId] of params.featureIds.entries()) {
    if (params.removedFeatureIds.has(featureId)) {
      removalCombinationIndex |= 1 << featureIndex
    }
  }
  return removalCombinationIndex
}

export function getPcbViaKey(params: {
  sourceNetId: GeneratedSourceNetId
  x: number
  y: number
}): PcbViaKey {
  return JSON.stringify([params.sourceNetId, roundCoordinate(params.x), roundCoordinate(params.y)])
}

function getPcbViaKeyForElement(params: {
  generatedSourceNetIdBySourceNetId: ReadonlyMap<SourceNetId, GeneratedSourceNetId>
  pcbVia: ImportedPcbVia
  sourceNetIdBySourceTraceId: ReadonlyMap<SourceTraceId, SourceNetId>
}): PcbViaKey | undefined {
  const sourceNetId =
    params.pcbVia.source_net_id ??
    (params.pcbVia.source_trace_id
      ? params.sourceNetIdBySourceTraceId.get(params.pcbVia.source_trace_id)
      : undefined)
  const generatedSourceNetId = sourceNetId
    ? params.generatedSourceNetIdBySourceNetId.get(sourceNetId)
    : undefined
  return generatedSourceNetId
    ? getPcbViaKey({
        sourceNetId: generatedSourceNetId,
        x: params.pcbVia.x,
        y: params.pcbVia.y,
      })
    : undefined
}

function getRemovedFeatureIds(params: {
  featureIds: FeatureId[]
  removalCombinationIndex: number
}): Set<FeatureId> {
  return new Set(
    params.featureIds.filter(
      (_featureId, featureIndex) => (params.removalCombinationIndex & (2 ** featureIndex)) !== 0,
    ),
  )
}

function roundCoordinate(coordinate: number): number {
  return Math.round(coordinate * 1e6) / 1e6
}
