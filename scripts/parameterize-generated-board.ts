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
  autorouterVersion: "beta_pipeline7" | "beta_pipeline9"
  featureIdByComponentName: ReadonlyMap<ComponentName, FeatureId>
  generatedSource: string
  routablePortSelectors: ReadonlySet<PortSelector>
  teardropPortSelectors: ReadonlySet<PortSelector>
  viaTeardropPortSelectors: ReadonlySet<PortSelector>
}): ParameterizedBoardSource {
  const sourceFile = ts.createSourceFile(
    `${params.componentName}.tsx`,
    params.generatedSource,
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

  for (const child of boardElement.children) {
    if (!ts.isJsxSelfClosingElement(child)) continue
    const tagName = child.tagName.getText(sourceFile)
    if (tagName === "chip") {
      addComponentFeatureCondition({
        componentElement: child,
        featureIdByComponentName: params.featureIdByComponentName,
        generatedSource: params.generatedSource,
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
    autorouterVersion: params.autorouterVersion,
    boardElement,
    replacements,
    sourceFile,
  })
  const parameterizedBody = applyReplacements({
    replacements,
    source: params.generatedSource,
  })
  const arrowPrefix = "export default () => ("
  if (!parameterizedBody.startsWith(arrowPrefix) || !parameterizedBody.endsWith(")")) {
    throw new Error(`${params.componentName} has an unexpected generated component shape`)
  }

  const featureEntries = [...params.featureIdByComponentName.entries()].filter(([componentName]) =>
    componentNameSet.has(componentName),
  )
  return {
    componentNames,
    source: createParameterizedBoardSource({
      componentName: params.componentName,
      featureEntries,
      jsxBody: parameterizedBody.slice(arrowPrefix.length, -1),
      routablePortSelectors: params.routablePortSelectors,
      teardropPortSelectors: params.teardropPortSelectors,
      viaTeardropPortSelectors: params.viaTeardropPortSelectors,
    }),
  }
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
  autorouterVersion: "beta_pipeline7" | "beta_pipeline9"
  boardElement: ts.JsxElement
  replacements: SourceReplacement[]
  sourceFile: ts.SourceFile
}): void {
  const routingDisabledAttribute = params.boardElement.openingElement.attributes.properties.find(
    (attribute) =>
      ts.isJsxAttribute(attribute) &&
      attribute.name.getText(params.sourceFile) === "routingDisabled",
  )
  const autorouterAttributes = `autorouter="auto" autorouterVersion="${params.autorouterVersion}" autorouterEffortLevel="1x"`
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
