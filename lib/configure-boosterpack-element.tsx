import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react"

type ConfigurableElementProps = {
  children?: ReactNode
  connections?: Record<string, string>
  from?: string
  name?: string
  to?: string
}

export function configureBoosterPackElement(params: {
  element: ReactNode
  excludedElementNames: string[]
}): ReactNode {
  const excludedElementNames = new Set(params.excludedElementNames)
  collectExcludedDescendantNames({
    element: params.element,
    excludedElementNames,
    isInsideExcludedElement: false,
  })
  return filterCircuitNode({ element: params.element, excludedElementNames })
}

function collectExcludedDescendantNames(params: {
  element: ReactNode
  excludedElementNames: Set<string>
  isInsideExcludedElement: boolean
}): void {
  if (!isValidElement(params.element)) return

  const element = params.element as ReactElement<ConfigurableElementProps>
  const isInsideExcludedElement =
    params.isInsideExcludedElement ||
    Boolean(element.props.name && params.excludedElementNames.has(element.props.name))
  if (isInsideExcludedElement && element.props.name) {
    params.excludedElementNames.add(element.props.name)
  }
  Children.forEach(element.props.children, (child) =>
    collectExcludedDescendantNames({
      element: child,
      excludedElementNames: params.excludedElementNames,
      isInsideExcludedElement,
    }),
  )
}

function filterCircuitNode(params: {
  element: ReactNode
  excludedElementNames: Set<string>
}): ReactNode {
  if (!isValidElement(params.element)) return params.element

  const element = params.element as ReactElement<ConfigurableElementProps>
  if (element.props.name && params.excludedElementNames.has(element.props.name)) return null
  if (referencesExcludedElement(element.props.from, params.excludedElementNames)) return null
  if (referencesExcludedElement(element.props.to, params.excludedElementNames)) return null

  const connections = filterConnections({
    connections: element.props.connections,
    excludedElementNames: params.excludedElementNames,
  })
  const children = Children.map(element.props.children, (child) =>
    filterCircuitNode({ element: child, excludedElementNames: params.excludedElementNames }),
  )

  return cloneElement(element, { connections }, children)
}

function filterConnections(params: {
  connections?: Record<string, string>
  excludedElementNames: Set<string>
}): Record<string, string> | undefined {
  if (!params.connections) return undefined

  return Object.fromEntries(
    Object.entries(params.connections).filter(
      ([, selector]) => !referencesExcludedElement(selector, params.excludedElementNames),
    ),
  )
}

function referencesExcludedElement(
  selector: string | undefined,
  excludedElementNames: Set<string>,
): boolean {
  if (!selector) return false
  for (const elementName of excludedElementNames) {
    if (selector.includes(`.${elementName} >`) || selector === `.${elementName}`) return true
  }
  return false
}
