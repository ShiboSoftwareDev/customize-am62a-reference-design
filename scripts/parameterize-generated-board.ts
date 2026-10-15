import ts from "typescript"
import {
  addRenamedNetSelectorReplacements,
  addPortSelectorReplacements,
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
  PcbTraceRouteKey,
} from "./ti-evm-reference-generator/get-imported-routing-metadata"

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
  portSelectorReplacements: ReadonlyMap<PortSelector, PortSelector>
  routablePortSelectors: ReadonlySet<PortSelector>
  supportedCopperPours?: readonly SupportedCopperPour[]
  teardropPortSelectors: ReadonlySet<PortSelector>
  viaTeardropPortSelectors: ReadonlySet<PortSelector>
}): ParameterizedBoardSource {
  const generatedSource = removeGeneratedCopperPours({ source: params.generatedSource })
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
  const pouredNetSelectors = addSupportedCopperPours({
    boardElement,
    copperPours: params.supportedCopperPours ?? [],
    renamedNets,
    replacements,
    sourceFile,
  })
  addImportedRoutingReplacements({
    boardElement,
    generatedSource,
    importedRoutingMetadata: params.importedRoutingMetadata,
    renamedNets,
    replacements,
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
      addPortSelectorReplacements({
        node: child,
        portSelectorReplacements: params.portSelectorReplacements,
        replacements,
        sourceFile,
      })
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

  replaceRoutingAttributes({
    boardElement,
    replacements,
    sourceFile,
  })
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
      jsxBody,
      pouredNetSelectors,
      routablePortSelectors: params.routablePortSelectors,
      teardropPortSelectors: params.teardropPortSelectors,
      viaTeardropPortSelectors: params.viaTeardropPortSelectors,
    }),
  }
}

function addImportedRoutingReplacements(params: {
  boardElement: ts.JsxElement
  generatedSource: string
  importedRoutingMetadata: ImportedRoutingMetadata | undefined
  renamedNets: ReadonlyMap<NetName, NetName>
  replacements: SourceReplacement[]
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
        sourceFile: params.sourceFile,
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
    text: wrapImportedRoutingElement({ elementSource: attributedElement }),
  })
}

function addImportedViaReplacement(params: {
  element: ts.JsxSelfClosingElement
  generatedSource: string
  renamedNets: ReadonlyMap<NetName, NetName>
  replacements: SourceReplacement[]
  sourceFile: ts.SourceFile
}): void {
  const connectsTo = getStringAttribute({
    element: params.element,
    name: "connectsTo",
    sourceFile: params.sourceFile,
  })
  const netName = connectsTo?.startsWith("net.") ? connectsTo.slice("net.".length) : undefined
  const renamedNet = netName ? params.renamedNets.get(netName) : undefined
  const originalElement = params.generatedSource.slice(
    params.element.getStart(params.sourceFile),
    params.element.getEnd(),
  )
  const emittedElement = renamedNet
    ? originalElement.replace(JSON.stringify(connectsTo), JSON.stringify(`net.${renamedNet}`))
    : originalElement
  params.replacements.push({
    start: params.element.getStart(params.sourceFile),
    end: params.element.getEnd(),
    text: wrapImportedRoutingElement({ elementSource: emittedElement }),
  })
}

function wrapImportedRoutingElement(params: { elementSource: string }): string {
  return `{removedFeatureIds.size === 0 && (${params.elementSource})}`
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
    text: "routingPhaseIndex={removedFeatureIds.size === 0 ? 0 : undefined} ",
  })
}

function removeGeneratedCopperPours(params: { source: string }): string {
  const sourceFile = ts.createSourceFile(
    "generated-board.tsx",
    params.source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const replacements: SourceReplacement[] = []
  collectGeneratedCopperPourReplacements({ node: sourceFile, replacements, sourceFile })
  return applyReplacements({ replacements, source: params.source }).replace(/^[ \t]+$/gmu, "")
}

function collectGeneratedCopperPourReplacements(params: {
  node: ts.Node
  replacements: SourceReplacement[]
  sourceFile: ts.SourceFile
}): void {
  if (
    ts.isJsxSelfClosingElement(params.node) &&
    ["copperpour", "pcbcopperpour"].includes(params.node.tagName.getText(params.sourceFile))
  ) {
    params.replacements.push({
      start: params.node.getFullStart(),
      end: params.node.getEnd(),
      text: "",
    })
    return
  }
  ts.forEachChild(params.node, (childNode) =>
    collectGeneratedCopperPourReplacements({ ...params, node: childNode }),
  )
}

function addSupportedCopperPours(params: {
  boardElement: ts.JsxElement
  copperPours: readonly SupportedCopperPour[]
  renamedNets: ReadonlyMap<NetName, NetName>
  replacements: SourceReplacement[]
  sourceFile: ts.SourceFile
}): Set<NetSelector> {
  const emittedNetNames = new Set(
    params.boardElement.children.flatMap((child) => {
      if (!ts.isJsxSelfClosingElement(child)) return []
      if (child.tagName.getText(params.sourceFile) !== "net") return []
      const netName = getStringAttribute({
        element: child,
        name: "name",
        sourceFile: params.sourceFile,
      })
      return netName ? [netName] : []
    }),
  )
  const availableNetNames = new Set(
    [...emittedNetNames].map((netName) => params.renamedNets.get(netName) ?? netName),
  )
  const pouredNetSelectors = new Set<NetSelector>()
  const copperPourElements = params.copperPours.flatMap((copperPour) => {
    const netName = params.renamedNets.get(copperPour.netName) ?? copperPour.netName
    pouredNetSelectors.add(`net.${netName}`)
    const netSelector = `net[name=${JSON.stringify(netName)}]`
    const netElement = availableNetNames.has(netName)
      ? []
      : [`<net name={${JSON.stringify(netName)}} />`]
    availableNetNames.add(netName)
    return [
      ...netElement,
      `<copperpour layer={${JSON.stringify(copperPour.layer)}} connectsTo={${JSON.stringify(netSelector)}} outline={${JSON.stringify(copperPour.outline)}} coveredWithSolderMask={${copperPour.coveredWithSolderMask}} />`,
    ]
  })
  if (copperPourElements.length === 0) return pouredNetSelectors

  const closingElementStart = params.boardElement.closingElement.getStart(params.sourceFile)
  const closingElementLineStart =
    params.sourceFile.text.lastIndexOf("\n", closingElementStart - 1) + 1
  params.replacements.push({
    start: closingElementLineStart,
    end: closingElementStart,
    text: `    ${copperPourElements.join("\n    ")}\n  `,
  })
  return pouredNetSelectors
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

function replaceRoutingAttributes(params: {
  boardElement: ts.JsxElement
  replacements: SourceReplacement[]
  sourceFile: ts.SourceFile
}): void {
  const routingDisabledAttribute = params.boardElement.openingElement.attributes.properties.find(
    (attribute) =>
      ts.isJsxAttribute(attribute) &&
      attribute.name.getText(params.sourceFile) === "routingDisabled",
  )
  const autorouterAttributes =
    'autorouter="auto" autorouterEffortLevel="1x" routeRemaining={removedFeatureIds.size > 0}'
  if (routingDisabledAttribute) {
    params.replacements.push({
      start: routingDisabledAttribute.getStart(params.sourceFile),
      end: routingDisabledAttribute.getEnd(),
      text: autorouterAttributes,
    })
    return
  }
  const insertionPosition = params.boardElement.openingElement.getEnd() - 1
  params.replacements.push({
    start: insertionPosition,
    end: insertionPosition,
    text: ` ${autorouterAttributes}`,
  })
}
