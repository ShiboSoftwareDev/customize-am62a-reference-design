type ComponentName = string
type FeatureId = string
type PortSelector = string

export function createParameterizedBoardSource(params: {
  componentName: string
  featureEntries: Array<readonly [ComponentName, FeatureId]>
  jsxBody: string
  routablePortSelectors: ReadonlySet<PortSelector>
  teardropPortSelectors: ReadonlySet<PortSelector>
  viaTeardropPortSelectors: ReadonlySet<PortSelector>
}): string {
  const featureIds = [...new Set(params.featureEntries.map(([, featureId]) => featureId))]
  const featureType = featureIds.map((featureId) => JSON.stringify(featureId)).join(" | ")
  const featureMap = JSON.stringify(Object.fromEntries(params.featureEntries), null, 2)
  const routablePortSelectors = JSON.stringify([...params.routablePortSelectors], null, 2)
  const teardropPortSelectors = JSON.stringify([...params.teardropPortSelectors], null, 2)
  const viaTeardropPortSelectors = JSON.stringify([...params.viaTeardropPortSelectors], null, 2)

  return `import { Fragment } from "react"
import "tscircuit"

export type ${params.componentName}FeatureId = ${featureType || "never"}

export type ${params.componentName}Props = {
  removedFeatureIds?: readonly string[]
  renderImportedCopperPours?: boolean
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
  const renderImportedCopperPours = props.renderImportedCopperPours ?? true
  return (${params.jsxBody})
}

export default ${params.componentName}
`
}
