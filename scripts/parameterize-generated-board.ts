import ts from "typescript"
import {
  addRenamedNetSelectorReplacements,
  applyReplacements,
  findBoardElement,
  getAttribute,
  getStringAttribute,
  type SourceReplacement,
} from "./generated-board-source/ast-helpers"
import { createParameterizedBoardSource } from "./generated-board-source/create-parameterized-board-source"
import type { SupportedCopperPour } from "./ti-evm-reference-generator/get-supported-copper-pours"
import type {
  ImportedPcbTraceMetadata,
  ImportedRoutingMetadata,
} from "./ti-evm-reference-generator/get-imported-routing-metadata"
import {
  getPcbViaKey,
  type ImportedRoutingInclusionMask,
  type PcbTraceRouteKey,
  type PcbViaKey,
} from "./ti-evm-reference-generator/get-imported-routing-inclusion-masks"

type ComponentName = string
type FeatureId = string
type NetName = string
type NetSelector = string
type PortSelector = string

export type ParameterizedBoardSource = {
  componentNames: ComponentName[]
  source: string
}

export function parameterizeGeneratedBoard(params: {
  componentName: string
  featureIdByComponentName: ReadonlyMap<ComponentName, FeatureId>
  generatedSource: string
  importedRoutingMetadata?: ImportedRoutingMetadata
  routablePortSelectors: ReadonlySet<PortSelector>
  supportedCopperPours?: readonly SupportedCopperPour[]
  teardropPortSelectors: ReadonlySet<PortSelector>
  viaTeardropPortSelectors: ReadonlySet<PortSelector>
}): ParameterizedBoardSource {
  const generatedSource = removeUnsupportedPcbCopperPours({ source: params.generatedSource })
  const sourceFile = ts.createSourceFile(
    `${params.componentName}.tsx`,
    generatedSource,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const boardElement = findBoardElement({ node: sourceFile, sourceFile })
  if (!boardElement) throw new Error(`${params.componentName} has no generated board element`)

  const replacements: SourceReplacement[] = []
  const componentNames = boardElement.children.flatMap((child) => {
    if (!ts.isJsxSelfClosingElement(child) || child.tagName.getText(sourceFile) !== "chip") {
      return []
    }
    const componentName = getStringAttribute({ element: child, name: "name", sourceFile })
    return componentName ? [componentName] : []
  })
  const componentNameSet = new Set<ComponentName>(componentNames)
  const renamedNets = renameNetsMatchingComponentNames({
    boardElement,
    componentNameSet,
    replacements,
    sourceFile,
  })
  const sourceNetIdByName = getGeneratedSourceNetIds({
    boardElement,
    renamedNets,
    sourceFile,
  })
  const pouredNetSelectors = getPouredNetSelectors({
    copperPours: params.supportedCopperPours ?? [],
    renamedNets,
  })
  addImportedRoutingReplacements({
    boardElement,
    generatedSource,
    importedRoutingMetadata: params.importedRoutingMetadata,
    renamedNets,
    replacements,
    sourceNetIdByName,
    sourceFile,
  })
  addImportedRoutingBridgeVias({
    boardElement,
    importedRoutingMetadata: params.importedRoutingMetadata,
    replacements,
    sourceNetIdByName,
    sourceFile,
  })

  for (const child of boardElement.children) {
    if (!ts.isJsxSelfClosingElement(child)) continue
    const tagName = child.tagName.getText(sourceFile)
    if (tagName === "chip") {
      addComponentFeatureCondition({
        componentElement: child,
        featureIdByComponentName: params.featureIdByComponentName,
        generatedSource,
        replacements,
        sourceFile,
      })
      continue
    }
    if (tagName === "trace") {
      addRenamedNetSelectorReplacements({
        node: child,
        renamedNets,
        replacements,
        sourceFile,
      })
      replacements.push({
        start: child.tagName.getStart(sourceFile),
        end: child.tagName.getEnd(),
        text: "ParameterizedTrace removedFeatureIds={removedFeatureIds}",
      })
      continue
    }
    if (tagName === "copperpour") {
      addRenamedNetSelectorReplacements({
        node: child,
        renamedNets,
        replacements,
        sourceFile,
      })
      continue
    }
    if (tagName === "net") {
      updateNetRoutingAttributes({
        importedRoutingMetadata: params.importedRoutingMetadata,
        netElement: child,
        pouredNetSelectors,
        replacements,
        renamedNets,
        sourceNetIdByName,
        sourceFile,
      })
    }
  }

  const parameterizedBody = applyReplacements({
    replacements,
    source: generatedSource,
  })
  const jsxBody = extractGeneratedJsxBody({
    componentName: params.componentName,
    generatedSource: parameterizedBody,
  })

  const featureEntries = [...params.featureIdByComponentName.entries()].filter(([componentName]) =>
    componentNameSet.has(componentName),
  )
  return {
    componentNames,
    source: createParameterizedBoardSource({
      componentName: params.componentName,
      featureEntries,
      importedRoutingFeatureIds: params.importedRoutingMetadata?.featureIds ?? [],
      jsxBody,
      pouredNetSelectors,
      routablePortSelectors: params.routablePortSelectors,
      supportedRemovalCombinationIndexes: params.importedRoutingMetadata
        ?.supportedRemovalCombinationIndexes ?? [0],
      teardropPortSelectors: params.teardropPortSelectors,
      viaTeardropPortSelectors: params.viaTeardropPortSelectors,
    }),
  }
}

function addImportedRoutingBridgeVias(params: {
  boardElement: ts.JsxElement
  importedRoutingMetadata: ImportedRoutingMetadata | undefined
  replacements: SourceReplacement[]
  sourceNetIdByName: ReadonlyMap<NetName, string>
  sourceFile: ts.SourceFile
}): void {
  if (!params.importedRoutingMetadata?.bridgeVias.length) return
  const boardCenter = {
    x: getNumericJsxAttribute({
      attributes: params.boardElement.openingElement.attributes,
      name: "pcbX",
      sourceFile: params.sourceFile,
    }),
    y: getNumericJsxAttribute({
      attributes: params.boardElement.openingElement.attributes,
      name: "pcbY",
      sourceFile: params.sourceFile,
    }),
  }
  const boardCenterX = boardCenter.x
  const boardCenterY = boardCenter.y
  if (boardCenterX === undefined || boardCenterY === undefined) {
    throw new Error("Generated board is missing a numeric PCB center")
  }
  const netNameBySourceNetId = new Map(
    [...params.sourceNetIdByName].map(([netName, sourceNetId]) => [sourceNetId, netName]),
  )
  const bridgeViaSource = params.importedRoutingMetadata.bridgeVias
    .flatMap((bridgeVia) => {
      const netName = netNameBySourceNetId.get(bridgeVia.sourceNetId)
      if (!netName) return []
      const viaSource = `<via pcbX=${JSON.stringify(`${bridgeVia.x - boardCenterX}mm`)} pcbY=${JSON.stringify(`${bridgeVia.y - boardCenterY}mm`)} holeDiameter=${JSON.stringify(`${bridgeVia.holeDiameter}mm`)} outerDiameter=${JSON.stringify(`${bridgeVia.outerDiameter}mm`)} fromLayer="top" toLayer="bottom" connectsTo={${JSON.stringify(`net.${netName}`)}} />`
      return [
        wrapImportedRoutingElement({
          elementSource: viaSource,
          inclusionMask: bridgeVia.inclusionMask,
        }),
      ]
    })
    .join("\n")
  if (!bridgeViaSource) return
  const insertionPosition = params.boardElement.closingElement.getStart(params.sourceFile)
  params.replacements.push({
    start: insertionPosition,
    end: insertionPosition,
    text: `${bridgeViaSource}\n`,
  })
}

function getNumericJsxAttribute(params: {
  attributes: ts.JsxAttributes
  name: string
  sourceFile: ts.SourceFile
}): number | undefined {
  const attribute = params.attributes.properties.find(
    (candidate) =>
      ts.isJsxAttribute(candidate) && candidate.name.getText(params.sourceFile) === params.name,
  )
  if (!attribute || !ts.isJsxAttribute(attribute) || !attribute.initializer) return undefined
  if (!ts.isJsxExpression(attribute.initializer)) return undefined
  const expression = attribute.initializer.expression
  if (!expression) return undefined
  if (ts.isNumericLiteral(expression)) return Number(expression.text)
  if (
    ts.isPrefixUnaryExpression(expression) &&
    expression.operator === ts.SyntaxKind.MinusToken &&
    ts.isNumericLiteral(expression.operand)
  ) {
    return -Number(expression.operand.text)
  }
  return undefined
}

function addImportedRoutingReplacements(params: {
  boardElement: ts.JsxElement
  generatedSource: string
  importedRoutingMetadata: ImportedRoutingMetadata | undefined
  renamedNets: ReadonlyMap<NetName, NetName>
  replacements: SourceReplacement[]
  sourceNetIdByName: ReadonlyMap<NetName, string>
  sourceFile: ts.SourceFile
}): void {
  const importedRoutingMetadata = params.importedRoutingMetadata
  if (!importedRoutingMetadata) return
  visitImportedRoutingNode({ ...params, importedRoutingMetadata, node: params.boardElement })
}

function visitImportedRoutingNode(params: {
  generatedSource: string
  importedRoutingMetadata: ImportedRoutingMetadata
  node: ts.Node
  renamedNets: ReadonlyMap<NetName, NetName>
  replacements: SourceReplacement[]
  sourceNetIdByName: ReadonlyMap<NetName, string>
  sourceFile: ts.SourceFile
}): void {
  if (ts.isJsxSelfClosingElement(params.node)) {
    const tagName = params.node.tagName.getText(params.sourceFile)
    if (tagName === "pcbtrace") {
      const metadata = getPcbTraceMetadata({
        element: params.node,
        metadataByRoute: params.importedRoutingMetadata.pcbTraceMetadataByRoute,
        sourceFile: params.sourceFile,
      })
      if (metadata) {
        addImportedPcbTraceReplacement({
          element: params.node,
          generatedSource: params.generatedSource,
          replacements: params.replacements,
          sourceFile: params.sourceFile,
          inclusionMask: metadata.inclusionMask,
          sourceNetId: metadata.sourceNetId,
        })
        return
      }
    }
    if (tagName === "via") {
      addImportedViaReplacement({
        element: params.node,
        generatedSource: params.generatedSource,
        renamedNets: params.renamedNets,
        replacements: params.replacements,
        sourceNetIdByName: params.sourceNetIdByName,
        sourceFile: params.sourceFile,
        metadataByKey: params.importedRoutingMetadata.viaMetadataByKey,
      })
      return
    }
  }
  ts.forEachChild(params.node, (childNode) =>
    visitImportedRoutingNode({ ...params, node: childNode }),
  )
}

function getPcbTraceMetadata(params: {
  element: ts.JsxSelfClosingElement
  metadataByRoute: ReadonlyMap<PcbTraceRouteKey, ImportedPcbTraceMetadata>
  sourceFile: ts.SourceFile
}): ImportedPcbTraceMetadata | undefined {
  const routeAttribute = getAttribute({
    element: params.element,
    name: "route",
    sourceFile: params.sourceFile,
  })
  if (!routeAttribute?.initializer || !ts.isJsxExpression(routeAttribute.initializer))
    return undefined
  const routeExpression = routeAttribute.initializer.expression
  return routeExpression
    ? params.metadataByRoute.get(routeExpression.getText(params.sourceFile))
    : undefined
}

function getGeneratedSourceNetIds(params: {
  boardElement: ts.JsxElement
  renamedNets: ReadonlyMap<NetName, NetName>
  sourceFile: ts.SourceFile
}): Map<NetName, string> {
  const sourceNetIdByName = new Map<NetName, string>()
  let sourceNetIndex = 0
  for (const child of params.boardElement.children) {
    if (!ts.isJsxSelfClosingElement(child) || child.tagName.getText(params.sourceFile) !== "net") {
      continue
    }
    const netName = getStringAttribute({
      element: child,
      name: "name",
      sourceFile: params.sourceFile,
    })
    if (!netName) continue
    const sourceNetId = `source_net_${sourceNetIndex}`
    sourceNetIdByName.set(netName, sourceNetId)
    const emittedNetName = params.renamedNets.get(netName)
    if (emittedNetName) sourceNetIdByName.set(emittedNetName, sourceNetId)
    sourceNetIndex += 1
  }
  return sourceNetIdByName
}

function addImportedPcbTraceReplacement(params: {
  element: ts.JsxSelfClosingElement
  generatedSource: string
  inclusionMask: ImportedRoutingInclusionMask
  replacements: SourceReplacement[]
  sourceFile: ts.SourceFile
  sourceNetId: string
}): void {
  const originalElement = params.generatedSource.slice(
    params.element.getStart(params.sourceFile),
    params.element.getEnd(),
  )
  const attributedElement = originalElement.replace(
    /^<pcbtrace/u,
    `<pcbtrace {...{ source_trace_id: ${JSON.stringify(params.sourceNetId)} }} `,
  )
  params.replacements.push({
    start: params.element.getStart(params.sourceFile),
    end: params.element.getEnd(),
    text: wrapImportedRoutingElement({
      elementSource: attributedElement,
      inclusionMask: params.inclusionMask,
    }),
  })
}

function addImportedViaReplacement(params: {
  element: ts.JsxSelfClosingElement
  generatedSource: string
  metadataByKey: ReadonlyMap<
    PcbViaKey,
    { inclusionMask: ImportedRoutingInclusionMask; sourceNetId: string }
  >
  renamedNets: ReadonlyMap<NetName, NetName>
  replacements: SourceReplacement[]
  sourceNetIdByName: ReadonlyMap<NetName, string>
  sourceFile: ts.SourceFile
}): void {
  const connectsTo = getStringAttribute({
    element: params.element,
    name: "connectsTo",
    sourceFile: params.sourceFile,
  })
  const netName = connectsTo?.startsWith("net.") ? connectsTo.slice("net.".length) : undefined
  const renamedNet = netName ? params.renamedNets.get(netName) : undefined
  const sourceNetId = netName ? params.sourceNetIdByName.get(netName) : undefined
  const originalElement = params.generatedSource.slice(
    params.element.getStart(params.sourceFile),
    params.element.getEnd(),
  )
  const emittedElement = renamedNet
    ? originalElement.replace(JSON.stringify(connectsTo), JSON.stringify(`net.${renamedNet}`))
    : originalElement
  const pcbX = getMillimeterAttribute({
    element: params.element,
    name: "pcbX",
    sourceFile: params.sourceFile,
  })
  const pcbY = getMillimeterAttribute({
    element: params.element,
    name: "pcbY",
    sourceFile: params.sourceFile,
  })
  const metadata =
    sourceNetId !== undefined && pcbX !== undefined && pcbY !== undefined
      ? params.metadataByKey.get(getPcbViaKey({ sourceNetId, x: pcbX, y: pcbY }))
      : undefined
  const inclusionMask = metadata?.inclusionMask
  params.replacements.push({
    start: params.element.getStart(params.sourceFile),
    end: params.element.getEnd(),
    text:
      inclusionMask !== undefined
        ? wrapImportedRoutingElement({ elementSource: emittedElement, inclusionMask })
        : emittedElement,
  })
}

function wrapImportedRoutingElement(params: {
  elementSource: string
  inclusionMask: ImportedRoutingInclusionMask
}): string {
  return `{isImportedRoutingElementIncluded({ inclusionMask: ${params.inclusionMask}n, removedFeatureCombinationIndex }) && (${params.elementSource})}`
}

function updateNetRoutingAttributes(params: {
  importedRoutingMetadata: ImportedRoutingMetadata | undefined
  netElement: ts.JsxSelfClosingElement
  pouredNetSelectors: ReadonlySet<NetSelector>
  replacements: SourceReplacement[]
  renamedNets: ReadonlyMap<NetName, NetName>
  sourceNetIdByName: ReadonlyMap<NetName, string>
  sourceFile: ts.SourceFile
}): void {
  const connectsToAttribute = getAttribute({
    element: params.netElement,
    name: "connectsTo",
    sourceFile: params.sourceFile,
  })
  if (connectsToAttribute) {
    params.replacements.push({
      start: connectsToAttribute.getFullStart(),
      end: connectsToAttribute.getEnd(),
      text: "",
    })
  }

  const netName = getStringAttribute({
    element: params.netElement,
    name: "name",
    sourceFile: params.sourceFile,
  })
  if (!netName || !params.importedRoutingMetadata) return
  const emittedNetName = params.renamedNets.get(netName) ?? netName
  const sourceNetId = params.sourceNetIdByName.get(netName)
  const hasImportedRouting = sourceNetId
    ? params.importedRoutingMetadata.sourceNetIdsWithImportedRouting.has(sourceNetId)
    : false
  const hasCopperPour = params.pouredNetSelectors.has(`net.${emittedNetName}`)
  if (hasImportedRouting || hasCopperPour) return
  params.replacements.push({
    start: params.netElement.getEnd() - 2,
    end: params.netElement.getEnd() - 2,
    text: "routingPhaseIndex={0} ",
  })
}

function getMillimeterAttribute(params: {
  element: ts.JsxSelfClosingElement
  name: string
  sourceFile: ts.SourceFile
}): number | undefined {
  const measurement = getStringAttribute(params)
  if (!measurement?.endsWith("mm")) return undefined
  const millimeters = Number.parseFloat(measurement.slice(0, -2))
  return Number.isFinite(millimeters) ? millimeters : undefined
}

function removeUnsupportedPcbCopperPours(params: { source: string }): string {
  const sourceFile = ts.createSourceFile(
    "generated-board.tsx",
    params.source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const replacements: SourceReplacement[] = []
  collectUnsupportedPcbCopperPourReplacements({
    node: sourceFile,
    replacements,
    sourceFile,
  })
  return applyReplacements({ replacements, source: params.source }).replace(/^[ \t]+$/gmu, "")
}

function collectUnsupportedPcbCopperPourReplacements(params: {
  node: ts.Node
  replacements: SourceReplacement[]
  sourceFile: ts.SourceFile
}): void {
  if (
    ts.isJsxSelfClosingElement(params.node) &&
    params.node.tagName.getText(params.sourceFile) === "pcbcopperpour"
  ) {
    params.replacements.push({
      start: params.node.getFullStart(),
      end: params.node.getEnd(),
      text: "",
    })
    return
  }
  ts.forEachChild(params.node, (childNode) =>
    collectUnsupportedPcbCopperPourReplacements({ ...params, node: childNode }),
  )
}

function getPouredNetSelectors(params: {
  copperPours: readonly SupportedCopperPour[]
  renamedNets: ReadonlyMap<NetName, NetName>
}): Set<NetSelector> {
  return new Set(
    params.copperPours.map((copperPour) => {
      const netName = params.renamedNets.get(copperPour.netName) ?? copperPour.netName
      return `net.${netName}`
    }),
  )
}

function extractGeneratedJsxBody(params: {
  componentName: string
  generatedSource: string
}): string {
  const wrappers = [
    {
      prefix: "export default () => (",
      suffix: ")",
    },
    {
      prefix: `export const ${params.componentName} = () => (`,
      suffix: `)\nexport default ${params.componentName}`,
    },
  ]
  const wrapper = wrappers.find(
    ({ prefix, suffix }) =>
      params.generatedSource.startsWith(prefix) && params.generatedSource.endsWith(suffix),
  )
  if (!wrapper) {
    throw new Error(`${params.componentName} has an unexpected generated component shape`)
  }

  return params.generatedSource.slice(wrapper.prefix.length, -wrapper.suffix.length)
}

function renameNetsMatchingComponentNames(params: {
  boardElement: ts.JsxElement
  componentNameSet: ReadonlySet<ComponentName>
  replacements: SourceReplacement[]
  sourceFile: ts.SourceFile
}): Map<NetName, NetName> {
  const renamedNets = new Map<NetName, NetName>()
  for (const child of params.boardElement.children) {
    if (!ts.isJsxSelfClosingElement(child) || child.tagName.getText(params.sourceFile) !== "net") {
      continue
    }
    const netName = getStringAttribute({
      element: child,
      name: "name",
      sourceFile: params.sourceFile,
    })
    if (!netName || !params.componentNameSet.has(netName)) continue
    const renamedNet = `NET_${netName}`
    renamedNets.set(netName, renamedNet)
    const nameAttribute = getAttribute({
      element: child,
      name: "name",
      sourceFile: params.sourceFile,
    })
    if (!nameAttribute?.initializer) continue
    params.replacements.push({
      start: nameAttribute.initializer.getStart(params.sourceFile),
      end: nameAttribute.initializer.getEnd(),
      text: JSON.stringify(renamedNet),
    })
  }
  return renamedNets
}

function addComponentFeatureCondition(params: {
  componentElement: ts.JsxSelfClosingElement
  featureIdByComponentName: ReadonlyMap<ComponentName, FeatureId>
  generatedSource: string
  replacements: SourceReplacement[]
  sourceFile: ts.SourceFile
}): void {
  const componentName = getStringAttribute({
    element: params.componentElement,
    name: "name",
    sourceFile: params.sourceFile,
  })
  if (!componentName || !params.featureIdByComponentName.get(componentName)) return
  const originalElement = params.generatedSource.slice(
    params.componentElement.getStart(params.sourceFile),
    params.componentElement.getEnd(),
  )
  params.replacements.push({
    start: params.componentElement.getStart(params.sourceFile),
    end: params.componentElement.getEnd(),
    text: `{isComponentIncluded({ componentName: ${JSON.stringify(componentName)}, removedFeatureIds }) && (${originalElement})}`,
  })
}
