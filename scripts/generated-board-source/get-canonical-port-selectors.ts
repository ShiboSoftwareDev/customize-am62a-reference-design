import ts from "typescript"
import { getAttribute, getStringAttribute, type SourceReplacement } from "./ast-helpers"

type CanonicalPortSelector = string
type GeneratedPortSelector = string
type PortSelector = string

export function getCanonicalPortSelectors(params: {
  boardElement: ts.JsxElement
  routablePortSelectors: ReadonlySet<PortSelector>
  sourceFile: ts.SourceFile
}): Map<GeneratedPortSelector, CanonicalPortSelector> {
  const canonicalPortSelectors = new Map<GeneratedPortSelector, CanonicalPortSelector>()

  for (const child of params.boardElement.children) {
    if (!ts.isJsxSelfClosingElement(child)) continue
    if (child.tagName.getText(params.sourceFile) !== "chip") continue

    const componentName = getStringAttribute({
      element: child,
      name: "name",
      sourceFile: params.sourceFile,
    })
    const pinLabels = getObjectAttribute({
      element: child,
      name: "pinLabels",
      sourceFile: params.sourceFile,
    })
    if (!componentName || !pinLabels) continue

    for (const property of pinLabels.properties) {
      if (!ts.isPropertyAssignment(property)) continue
      if (!ts.isArrayLiteralExpression(property.initializer)) continue
      const portNames = [
        getPropertyName(property.name),
        ...property.initializer.elements.map((alias) =>
          ts.isStringLiteral(alias) ? alias.text : undefined,
        ),
      ].filter((portName): portName is string => portName !== undefined)
      const canonicalSelector = portNames
        .map((portName) => `.${componentName} > .${portName}`)
        .find((selector) => params.routablePortSelectors.has(selector))
      if (!canonicalSelector) continue

      for (const portName of portNames) {
        canonicalPortSelectors.set(`.${componentName} > .${portName}`, canonicalSelector)
      }
    }
  }

  return canonicalPortSelectors
}

export function addCanonicalPortSelectorReplacements(params: {
  canonicalPortSelectors: ReadonlyMap<GeneratedPortSelector, CanonicalPortSelector>
  node: ts.Node
  replacements: SourceReplacement[]
  sourceFile: ts.SourceFile
}): void {
  if (ts.isStringLiteral(params.node)) {
    const canonicalSelector = params.canonicalPortSelectors.get(params.node.text)
    if (canonicalSelector && canonicalSelector !== params.node.text) {
      params.replacements.push({
        start: params.node.getStart(params.sourceFile),
        end: params.node.getEnd(),
        text: JSON.stringify(canonicalSelector),
      })
    }
  }
  for (const childNode of params.node.getChildren(params.sourceFile)) {
    addCanonicalPortSelectorReplacements({ ...params, node: childNode })
  }
}

function getObjectAttribute(params: {
  element: ts.JsxSelfClosingElement
  name: string
  sourceFile: ts.SourceFile
}): ts.ObjectLiteralExpression | undefined {
  const initializer = getAttribute(params)?.initializer
  if (!initializer || !ts.isJsxExpression(initializer)) return undefined
  return initializer.expression && ts.isObjectLiteralExpression(initializer.expression)
    ? initializer.expression
    : undefined
}

function getPropertyName(name: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text
  }
  return undefined
}
