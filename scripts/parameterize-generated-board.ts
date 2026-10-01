import ts from "typescript"

type SourceReplacement = {
  end: number
  start: number
  text: string
}

export type ParameterizedBoardSource = {
  componentNames: string[]
  source: string
}

export function parameterizeGeneratedBoard(params: {
  componentName: string
  autorouterVersion: "beta_pipeline7" | "beta_pipeline9"
  featureIdByComponentName: ReadonlyMap<string, string>
  generatedSource: string
  routablePortSelectors: ReadonlySet<string>
  teardropPortSelectors: ReadonlySet<string>
  viaTeardropPortSelectors: ReadonlySet<string>
}): ParameterizedBoardSource {
  const sourceFile = ts.createSourceFile(
    `${params.componentName}.tsx`,
    params.generatedSource,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const boardElement = findBoardElement(sourceFile)
  if (!boardElement) throw new Error(`${params.componentName} has no generated board element`)

  const replacements: SourceReplacement[] = []
  const componentNames = boardElement.children.flatMap((child) => {
    if (!ts.isJsxSelfClosingElement(child) || child.tagName.getText(sourceFile) !== "chip") {
      return []
    }
    const componentName = getStringAttribute({ element: child, name: "name", sourceFile })
    return componentName ? [componentName] : []
  })
  const componentNameSet = new Set(componentNames)
  const renamedNets = new Map<string, string>()
  for (const child of boardElement.children) {
    if (!ts.isJsxSelfClosingElement(child) || child.tagName.getText(sourceFile) !== "net") continue
    const netName = getStringAttribute({ element: child, name: "name", sourceFile })
    if (!netName || !componentNameSet.has(netName)) continue
    renamedNets.set(netName, `NET_${netName}`)
    const nameAttribute = getAttribute({ element: child, name: "name", sourceFile })
    if (!nameAttribute?.initializer) continue
    replacements.push({
      start: nameAttribute.initializer.getStart(sourceFile),
      end: nameAttribute.initializer.getEnd(),
      text: JSON.stringify(`NET_${netName}`),
    })
  }

  for (const child of boardElement.children) {
    if (!ts.isJsxSelfClosingElement(child)) continue
    const tagName = child.tagName.getText(sourceFile)
    if (tagName === "chip") {
      const componentName = getStringAttribute({
        element: child,
        name: "name",
        sourceFile,
      })
      if (!componentName) continue
      const featureId = params.featureIdByComponentName.get(componentName)
      if (!featureId) continue
      const originalElement = params.generatedSource.slice(
        child.getStart(sourceFile),
        child.getEnd(),
      )
      replacements.push({
        start: child.getStart(sourceFile),
        end: child.getEnd(),
        text: `{isComponentIncluded({ componentName: ${JSON.stringify(componentName)}, removedFeatureIds }) && (${originalElement})}`,
      })
      continue
    }
    if (tagName === "trace") {
      const visitTraceNode = (node: ts.Node): void => {
        if (ts.isStringLiteral(node) && node.text.startsWith("net.")) {
          const renamedNet = renamedNets.get(node.text.slice("net.".length))
          if (renamedNet) {
            replacements.push({
              start: node.getStart(sourceFile),
              end: node.getEnd(),
              text: JSON.stringify(`net.${renamedNet}`),
            })
          }
        }
        ts.forEachChild(node, visitTraceNode)
      }
      visitTraceNode(child)
      replacements.push({
        start: child.tagName.getStart(sourceFile),
        end: child.tagName.getEnd(),
        text: "ParameterizedTrace removedFeatureIds={removedFeatureIds}",
      })
    }
  }

  const routingDisabledAttribute = boardElement.openingElement.attributes.properties.find(
    (attribute) =>
      ts.isJsxAttribute(attribute) && attribute.name.getText(sourceFile) === "routingDisabled",
  )
  const autorouterAttributes = `autorouter="auto" autorouterVersion="${params.autorouterVersion}" autorouterEffortLevel="1x"`
  if (routingDisabledAttribute) {
    replacements.push({
      start: routingDisabledAttribute.getStart(sourceFile),
      end: routingDisabledAttribute.getEnd(),
      text: autorouterAttributes,
    })
  } else {
    replacements.push({
      start: boardElement.openingElement.getEnd() - 1,
      end: boardElement.openingElement.getEnd() - 1,
      text: ` ${autorouterAttributes}`,
    })
  }

  const parameterizedBody = applyReplacements({
    replacements,
    source: params.generatedSource,
  })
  const arrowPrefix = "export default () => ("
  if (!parameterizedBody.startsWith(arrowPrefix)) {
    throw new Error(`${params.componentName} has an unexpected generated export`)
  }
  if (!parameterizedBody.endsWith(")")) {
    throw new Error(`${params.componentName} has an unexpected generated function ending`)
  }

  const featureEntries = [...params.featureIdByComponentName.entries()].filter(([name]) =>
    componentNames.includes(name),
  )
  const featureIds = [...new Set(featureEntries.map(([, featureId]) => featureId))]
  const featureType = featureIds.map((featureId) => JSON.stringify(featureId)).join(" | ")
  const featureMap = JSON.stringify(Object.fromEntries(featureEntries), null, 2)
  const routablePortSelectors = JSON.stringify([...params.routablePortSelectors], null, 2)
  const teardropPortSelectors = JSON.stringify([...params.teardropPortSelectors], null, 2)
  const viaTeardropPortSelectors = JSON.stringify([...params.viaTeardropPortSelectors], null, 2)
  const jsxBody = parameterizedBody.slice(arrowPrefix.length, -1)
  const source = `import { Fragment } from "react"
import "tscircuit"

export type ${params.componentName}FeatureId = ${featureType || "never"}

export type ${params.componentName}Props = {
  removedFeatureIds?: readonly string[]
}

const featureIdByComponentName: Partial<Record<string, ${params.componentName}FeatureId>> =
  ${featureMap}

const routablePortSelectors = new Set<string>(${routablePortSelectors})
const teardropPortSelectors = new Set<string>(${teardropPortSelectors})
const viaTeardropPortSelectors = new Set<string>(${viaTeardropPortSelectors})

function isComponentIncluded(params: {
  componentName: string
  removedFeatureIds: ReadonlySet<string>
}): boolean {
  const featureId = featureIdByComponentName[params.componentName]
  return featureId === undefined || !params.removedFeatureIds.has(featureId)
}

function ParameterizedTrace(props: {
  path: string[]
  removedFeatureIds: ReadonlySet<string>
}) {
  const path = props.path.filter((selector) => {
    const componentName = /^\\.([^ >]+)\\s*>\\s*\\./u.exec(selector)?.[1]
    return (
      componentName === undefined ||
      (routablePortSelectors.has(selector) &&
        isComponentIncluded({ componentName, removedFeatureIds: props.removedFeatureIds }))
    )
  })
  if (path.length < 2) return null

  const netSelector = path.find((selector) => selector.startsWith("net."))
  const portSelectors = path.filter((selector) => selector.startsWith("."))
  const hasPadTeardrops = portSelectors.some((selector) =>
    teardropPortSelectors.has(selector),
  )
  const hasViaTeardrops = portSelectors.some((selector) =>
    viaTeardropPortSelectors.has(selector),
  )
  if (!netSelector || (!hasPadTeardrops && !hasViaTeardrops)) {
    return <trace path={path} />
  }

  return (
    <Fragment>
      {portSelectors.map((selector) => (
        <Fragment key={selector}>
          <trace
            from={selector}
            to={netSelector}
            pcbTeardrops={hasViaTeardrops}
            pcbTeardropStart={
              teardropPortSelectors.has(selector)
                ? true
                : hasViaTeardrops
                  ? false
                  : undefined
            }
          />
        </Fragment>
      ))}
    </Fragment>
  )
}

export function ${params.componentName}(props: ${params.componentName}Props) {
  const removedFeatureIds = new Set(props.removedFeatureIds ?? [])
  return (${jsxBody})
}

export default ${params.componentName}
`

  return { componentNames, source }
}

function findBoardElement(sourceFile: ts.SourceFile): ts.JsxElement | undefined {
  let boardElement: ts.JsxElement | undefined
  const visit = (node: ts.Node): void => {
    if (
      boardElement === undefined &&
      ts.isJsxElement(node) &&
      node.openingElement.tagName.getText(sourceFile) === "board"
    ) {
      boardElement = node
      return
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return boardElement
}

function getStringAttribute(params: {
  element: ts.JsxSelfClosingElement
  name: string
  sourceFile: ts.SourceFile
}): string | undefined {
  const attribute = getAttribute(params)
  if (!attribute?.initializer) return undefined
  return ts.isStringLiteral(attribute.initializer) ? attribute.initializer.text : undefined
}

function getAttribute(params: {
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

function applyReplacements(params: { replacements: SourceReplacement[]; source: string }): string {
  let source = params.source
  const replacements = [...params.replacements].sort((first, second) => second.start - first.start)
  for (const replacement of replacements) {
    source = `${source.slice(0, replacement.start)}${replacement.text}${source.slice(replacement.end)}`
  }
  return source
}
