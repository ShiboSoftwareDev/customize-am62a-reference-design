import ts from "typescript"
import {
  addRenamedNetSelectorReplacements,
  applyReplacements,
  findBoardElement,
  getJsxOpeningLikeElement,
  getStringArrayAttribute,
  getStringAttribute,
  type SourceReplacement,
} from "./generated-board-source/ast-helpers"
import { createParameterizedBoardSource } from "./generated-board-source/create-parameterized-board-source"
import {
  addCanonicalPortSelectorReplacements,
  getCanonicalPortSelectors,
} from "./generated-board-source/get-canonical-port-selectors"
import type { SupportedCopperPour } from "./ti-evm-reference-generator/get-supported-copper-pours"

type ComponentName = string
type FeatureId = string
type NetName = string
type NetSelector = string
type PortSelector = string
type GeneratedChipElement = ts.JsxElement | ts.JsxSelfClosingElement

type GeneratedChip = {
  element: GeneratedChipElement
  openingElement: ts.JsxOpeningLikeElement
}

export type ParameterizedBoardSource = {
  componentNames: ComponentName[]
  source: string
}

export function parameterizeGeneratedBoard(params: {
  componentName: string
  featureIdByComponentName: ReadonlyMap<ComponentName, FeatureId>
  generatedSource: string
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
    const generatedChip = getGeneratedChip({ child, sourceFile })
    if (!generatedChip) return []
    const componentName = getStringAttribute({
      element: generatedChip.openingElement,
      name: "name",
      sourceFile,
    })
    return componentName ? [componentName] : []
  })
  const componentNameSet = new Set<ComponentName>(componentNames)
  const canonicalPortSelectors = getCanonicalPortSelectors({
    boardElement,
    routablePortSelectors: params.routablePortSelectors,
    sourceFile,
  })
  const renamedNets = renameNetsMatchingComponentNames({
    boardElement,
    componentNameSet,
    sourceFile,
  })
  const pouredNetSelectors = addSupportedCopperPours({
    boardElement,
    copperPours: params.supportedCopperPours ?? [],
    renamedNets,
    replacements,
    sourceFile,
  })

  for (const child of boardElement.children) {
    const generatedChip = getGeneratedChip({ child, sourceFile })
    if (generatedChip) {
      addComponentFeatureCondition({
        componentElement: generatedChip.element,
        componentOpeningElement: generatedChip.openingElement,
        featureIdByComponentName: params.featureIdByComponentName,
        generatedSource,
        replacements,
        sourceFile,
      })
      continue
    }
    if (!ts.isJsxSelfClosingElement(child)) continue
    const tagName = child.tagName.getText(sourceFile)
    if (tagName === "net") {
      const netName = getStringAttribute({
        element: child,
        name: "name",
        sourceFile,
      })
      if (!netName) continue
      const runtimeNetName = renamedNets.get(netName) ?? netName
      const portSelectors = (
        getStringArrayAttribute({
          element: child,
          name: "connectsTo",
          sourceFile,
        }) ?? []
      ).map((selector) => canonicalPortSelectors.get(selector) ?? selector)
      replacements.push({
        start: child.getStart(sourceFile),
        end: child.getEnd(),
        text: `<ParameterizedNet removedFeatureIds={removedFeatureIds} name=${JSON.stringify(runtimeNetName)} connectsTo={${JSON.stringify(portSelectors)}} />`,
      })
      continue
    }
    if (tagName === "trace") {
      addCanonicalPortSelectorReplacements({
        canonicalPortSelectors,
        node: child,
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

function removeGeneratedCopperPours(params: { source: string }): string {
  const sourceFile = ts.createSourceFile(
    "generated-board.tsx",
    params.source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const replacements: SourceReplacement[] = []
  const visit = (node: ts.Node): void => {
    if (
      ts.isJsxSelfClosingElement(node) &&
      ["copperpour", "pcbcopperpour"].includes(node.tagName.getText(sourceFile))
    ) {
      replacements.push({
        start: node.getFullStart(),
        end: node.getEnd(),
        text: "",
      })
      return
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return applyReplacements({ replacements, source: params.source }).replace(/^[ \t]+$/gmu, "")
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
  }
  return renamedNets
}

function addComponentFeatureCondition(params: {
  componentElement: GeneratedChipElement
  componentOpeningElement: ts.JsxOpeningLikeElement
  featureIdByComponentName: ReadonlyMap<ComponentName, FeatureId>
  generatedSource: string
  replacements: SourceReplacement[]
  sourceFile: ts.SourceFile
}): void {
  const componentName = getStringAttribute({
    element: params.componentOpeningElement,
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

function getGeneratedChip(params: {
  child: ts.JsxChild
  sourceFile: ts.SourceFile
}): GeneratedChip | undefined {
  const openingElement = getJsxOpeningLikeElement(params.child)
  if (openingElement?.tagName.getText(params.sourceFile) !== "chip") {
    return undefined
  }
  if (!ts.isJsxElement(params.child) && !ts.isJsxSelfClosingElement(params.child)) {
    return undefined
  }
  return { element: params.child, openingElement }
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
  const autorouterAttributes = 'autorouter="auto" autorouterEffortLevel="1x" routeRemaining'
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
