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

type ComponentName = string
type FeatureId = string
type NetName = string
type PortSelector = string

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
  const generatedSource = removeLegacyPcbCopperPours({ source: params.generatedSource })
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
  addSupportedCopperPours({
    boardElement,
    copperPours: params.supportedCopperPours ?? [],
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
      routablePortSelectors: params.routablePortSelectors,
      teardropPortSelectors: params.teardropPortSelectors,
      viaTeardropPortSelectors: params.viaTeardropPortSelectors,
    }),
  }
}

function removeLegacyPcbCopperPours(params: { source: string }): string {
  const sourceFile = ts.createSourceFile(
    "generated-board.tsx",
    params.source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const replacements: SourceReplacement[] = []
  const visit = (node: ts.Node): void => {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(sourceFile) === "pcbcopperpour") {
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
}): void {
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
  const copperPourElements = params.copperPours.flatMap((copperPour) => {
    const netName = params.renamedNets.get(copperPour.netName) ?? copperPour.netName
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
  if (copperPourElements.length === 0) return

  const closingElementStart = params.boardElement.closingElement.getStart(params.sourceFile)
  const closingElementLineStart =
    params.sourceFile.text.lastIndexOf("\n", closingElementStart - 1) + 1
  params.replacements.push({
    start: closingElementLineStart,
    end: closingElementStart,
    text: `    ${copperPourElements.join("\n    ")}\n  `,
  })
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
  const autorouterAttributes = 'autorouter="auto" autorouterEffortLevel="1x"'
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
