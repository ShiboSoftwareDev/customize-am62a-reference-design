import type ts from "typescript"
import type { SupportedCopperPour } from "../ti-evm-reference-generator/get-supported-copper-pours"
import { getStringAttribute, type SourceReplacement } from "./ast-helpers"
import { applyCopperPourSettings } from "./apply-copper-pour-settings"

type CopperPourKey = string
type NetName = string

export type SupportedCopperPoursByKey = Map<CopperPourKey, SupportedCopperPour[]>

export function createSupportedCopperPoursByKey(params: {
  copperPours: readonly SupportedCopperPour[]
}): SupportedCopperPoursByKey {
  const copperPoursByKey = new Map<CopperPourKey, SupportedCopperPour[]>()
  for (const copperPour of params.copperPours) {
    const copperPourKey = getSupportedCopperPourKey(copperPour)
    const matchingCopperPours = copperPoursByKey.get(copperPourKey) ?? []
    matchingCopperPours.push(copperPour)
    copperPoursByKey.set(copperPourKey, matchingCopperPours)
  }
  return copperPoursByKey
}

export function addCopperPourFeatureCondition(params: {
  copperPourElement: ts.JsxSelfClosingElement
  generatedSource: string
  renamedNets: ReadonlyMap<NetName, NetName>
  replacements: SourceReplacement[]
  sourceFile: ts.SourceFile
  supportedCopperPoursByKey: SupportedCopperPoursByKey
  computeAllCopperPours?: boolean
}): void {
  const copperPourKey = getGeneratedCopperPourKey({
    copperPourElement: params.copperPourElement,
    sourceFile: params.sourceFile,
  })
  const matchingCopperPours = copperPourKey
    ? params.supportedCopperPoursByKey.get(copperPourKey)
    : undefined
  const supportedCopperPour = matchingCopperPours?.shift()
  if (!matchingCopperPours || !supportedCopperPour) {
    throw new Error(`Generated TSX contains an unexpected copper pour: ${copperPourKey}`)
  }
  if (matchingCopperPours.length === 0 && copperPourKey) {
    params.supportedCopperPoursByKey.delete(copperPourKey)
  }

  const originalElement = applyCopperPourSettings({
    ...params,
    supportedCopperPour,
    computeAllCopperPours: params.computeAllCopperPours ?? false,
  })
  const connectsTo = getStringAttribute({
    element: params.copperPourElement,
    name: "connectsTo",
    sourceFile: params.sourceFile,
  })
  const emittedElement = getCopperPourWithRenamedNet({
    connectsTo,
    copperPourSource: originalElement,
    renamedNets: params.renamedNets,
  })
  const removableFeatureId = supportedCopperPour.removableFeatureId
  params.replacements.push({
    start: params.copperPourElement.getStart(params.sourceFile),
    end: params.copperPourElement.getEnd(),
    text: removableFeatureId
      ? `{!removedFeatureIds.has(${JSON.stringify(removableFeatureId)}) && (${emittedElement})}`
      : emittedElement,
  })
}

export function getUnmatchedCopperPourIds(
  supportedCopperPoursByKey: SupportedCopperPoursByKey,
): string[] {
  return [...supportedCopperPoursByKey.values()]
    .flat()
    .map(({ pcbCopperPourId }) => pcbCopperPourId)
}

function getCopperPourWithRenamedNet(params: {
  connectsTo: string | undefined
  copperPourSource: string
  renamedNets: ReadonlyMap<NetName, NetName>
}): string {
  const nameSelectorMatch = params.connectsTo
    ? /^net\[name=(["'])(.+)\1\]$/u.exec(params.connectsTo)
    : undefined
  const netName = nameSelectorMatch?.[2]
  const renamedNetName = netName ? params.renamedNets.get(netName) : undefined
  if (!params.connectsTo || !renamedNetName) return params.copperPourSource
  return params.copperPourSource.replace(
    JSON.stringify(params.connectsTo),
    JSON.stringify(`net[name=${JSON.stringify(renamedNetName)}]`),
  )
}

function getSupportedCopperPourKey(copperPour: SupportedCopperPour): CopperPourKey {
  return JSON.stringify([copperPour.layer, `net[name=${JSON.stringify(copperPour.netName)}]`])
}

function getGeneratedCopperPourKey(params: {
  copperPourElement: ts.JsxSelfClosingElement
  sourceFile: ts.SourceFile
}): CopperPourKey | undefined {
  const layer = getStringAttribute({
    element: params.copperPourElement,
    name: "layer",
    sourceFile: params.sourceFile,
  })
  const connectsTo = getStringAttribute({
    element: params.copperPourElement,
    name: "connectsTo",
    sourceFile: params.sourceFile,
  })
  if (!layer || !connectsTo) return undefined
  return JSON.stringify([layer, getComparableCopperPourNetSelector(connectsTo)])
}

function getComparableCopperPourNetSelector(netSelector: string): string {
  return netSelector.replace(/^net\[name="__circuit_json_unassigned_/u, 'net[name="__unassigned_')
}
