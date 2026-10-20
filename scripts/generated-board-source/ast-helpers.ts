import ts from "typescript"

type NetName = string

export type SourceReplacement = {
  end: number
  start: number
  text: string
}

export function findBoardElement(params: {
  node: ts.Node
  sourceFile: ts.SourceFile
}): ts.JsxElement | undefined {
  if (
    ts.isJsxElement(params.node) &&
    params.node.openingElement.tagName.getText(params.sourceFile) === "board"
  ) {
    return params.node
  }
  return params.node
    .getChildren(params.sourceFile)
    .map((node) => findBoardElement({ node, sourceFile: params.sourceFile }))
    .find((boardElement) => boardElement !== undefined)
}

export function addRenamedNetSelectorReplacements(params: {
  node: ts.Node
  renamedNets: ReadonlyMap<NetName, NetName>
  replacements: SourceReplacement[]
  sourceFile: ts.SourceFile
}): void {
  if (ts.isStringLiteral(params.node)) {
    const renamedSelector = getRenamedNetSelector({
      netSelector: params.node.text,
      renamedNets: params.renamedNets,
    })
    if (renamedSelector) {
      params.replacements.push({
        start: params.node.getStart(params.sourceFile),
        end: params.node.getEnd(),
        text: JSON.stringify(renamedSelector),
      })
    }
  }
  for (const childNode of params.node.getChildren(params.sourceFile)) {
    addRenamedNetSelectorReplacements({ ...params, node: childNode })
  }
}

function getRenamedNetSelector(params: {
  netSelector: string
  renamedNets: ReadonlyMap<NetName, NetName>
}): string | undefined {
  if (params.netSelector.startsWith("net.")) {
    const netName = params.netSelector.slice("net.".length)
    const renamedNet = params.renamedNets.get(netName)
    return renamedNet ? `net.${renamedNet}` : undefined
  }

  const nameSelectorMatch = /^net\[name=(["'])(.+)\1\]$/u.exec(params.netSelector)
  const netName = nameSelectorMatch?.[2]
  if (!netName) return undefined
  const renamedNet = params.renamedNets.get(netName)
  return renamedNet ? `net[name=${JSON.stringify(renamedNet)}]` : undefined
}

export function getStringAttribute(params: {
  element: ts.JsxSelfClosingElement
  name: string
  sourceFile: ts.SourceFile
}): string | undefined {
  const attribute = getAttribute(params)
  if (!attribute?.initializer) return undefined
  if (ts.isStringLiteral(attribute.initializer)) {
    return attribute.initializer.text
  }
  if (!ts.isJsxExpression(attribute.initializer)) return undefined
  const expression = attribute.initializer.expression
  return expression && ts.isStringLiteral(expression) ? expression.text : undefined
}

export function getAttribute(params: {
  element: ts.JsxSelfClosingElement
  name: string
  sourceFile: ts.SourceFile
}): ts.JsxAttribute | undefined {
  const attribute = params.element.attributes.properties.find(
    (candidate) =>
      ts.isJsxAttribute(candidate) && candidate.name.getText(params.sourceFile) === params.name,
  )
  return attribute && ts.isJsxAttribute(attribute) ? attribute : undefined
}

export function applyReplacements(params: {
  replacements: SourceReplacement[]
  source: string
}): string {
  let updatedSource = params.source
  const replacements = [...params.replacements].sort((first, second) => second.start - first.start)
  for (const replacement of replacements) {
    updatedSource = `${updatedSource.slice(0, replacement.start)}${replacement.text}${updatedSource.slice(replacement.end)}`
  }
  return updatedSource
}
