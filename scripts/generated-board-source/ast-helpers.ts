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
  if (ts.isStringLiteral(params.node) && params.node.text.startsWith("net.")) {
    const renamedNet = params.renamedNets.get(params.node.text.slice("net.".length))
    if (renamedNet) {
      params.replacements.push({
        start: params.node.getStart(params.sourceFile),
        end: params.node.getEnd(),
        text: JSON.stringify(`net.${renamedNet}`),
      })
    }
  }
  for (const childNode of params.node.getChildren(params.sourceFile)) {
    addRenamedNetSelectorReplacements({ ...params, node: childNode })
  }
}

export function getStringAttribute(params: {
  element: ts.JsxSelfClosingElement
  name: string
  sourceFile: ts.SourceFile
}): string | undefined {
  const attribute = getAttribute(params)
  if (!attribute?.initializer) return undefined
  return ts.isStringLiteral(attribute.initializer) ? attribute.initializer.text : undefined
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
