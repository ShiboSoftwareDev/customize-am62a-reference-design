import type { AnyCircuitElement } from "circuit-json"
import {
  getBaselineDanglingEndpointKeys,
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
  traceInclusionMaskByRouteKey: ReadonlyMap<PcbTraceRouteKey, ImportedRoutingInclusionMask>
  viaInclusionMaskByViaKey: ReadonlyMap<PcbViaKey, ImportedRoutingInclusionMask>
}

export function getImportedRoutingInclusionMasks(params: {
  circuitJson: AnyCircuitElement[]
  featureIdBySourceComponentId: ReadonlyMap<SourceComponentId, FeatureId>
  generatedSourceNetIdBySourceNetId: ReadonlyMap<SourceNetId, GeneratedSourceNetId>
  sourceNetIdBySourceTraceId: ReadonlyMap<SourceTraceId, SourceNetId>
}): ImportedRoutingInclusionMasks {
  const featureIds = [...new Set(params.featureIdBySourceComponentId.values())]
  const pcbTraces = getImportedPcbTraces(params.circuitJson)
  const pcbVias = getImportedPcbVias(params.circuitJson)
  const baselineDanglingEndpointKeys = getBaselineDanglingEndpointKeys(params.circuitJson)
  const traceInclusionMaskByRouteKey = new Map<PcbTraceRouteKey, ImportedRoutingInclusionMask>()
  const viaInclusionMaskByViaKey = new Map<PcbViaKey, ImportedRoutingInclusionMask>()
  const bridgeViaInclusionMaskByViaKey = new Map<PcbViaKey, ImportedRoutingInclusionMask>()
  const bridgeViaByViaKey = new Map<PcbViaKey, ImportedRoutingBridgeVia>()
  const removalCombinationCount = 2 ** featureIds.length

  for (
    let removalCombinationIndex = 0;
    removalCombinationIndex < removalCombinationCount;
    removalCombinationIndex += 1
  ) {
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
    traceInclusionMaskByRouteKey,
    viaInclusionMaskByViaKey,
  }
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
