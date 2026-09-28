import { expect, test } from "bun:test"
import { Children, isValidElement, type ReactElement, type ReactNode } from "react"
import { configureBoosterPackElement } from "lib/configure-boosterpack-element"

test("removes excluded components, their groups, and traces that reference them", () => {
  const configuredElement = configureBoosterPackElement({
    element: (
      <CircuitElement>
        <CircuitElement name="OPTIONAL_BLOCK">
          <CircuitElement name="R1" />
        </CircuitElement>
        <CircuitElement name="R2" />
        <CircuitElement from=".R1 > .pin1" to=".R2 > .pin1" />
      </CircuitElement>
    ),
    excludedElementNames: ["OPTIONAL_BLOCK"],
  })
  const elementNames = collectElementNames(configuredElement)

  expect(elementNames).not.toContain("OPTIONAL_BLOCK")
  expect(elementNames).not.toContain("R1")
  expect(elementNames).toContain("R2")
  expect(collectFromSelectors(configuredElement)).toHaveLength(0)
})

function CircuitElement(props: {
  children?: ReactNode
  from?: string
  name?: string
  to?: string
}) {
  return <>{props.children}</>
}

function collectElementNames(element: ReactNode): string[] {
  if (!isValidElement(element)) return []
  const reactElement = element as ReactElement<{ children?: ReactNode; name?: string }>
  return [
    ...(reactElement.props.name ? [reactElement.props.name] : []),
    ...Children.toArray(reactElement.props.children).flatMap(collectElementNames),
  ]
}

function collectFromSelectors(element: ReactNode): string[] {
  if (!isValidElement(element)) return []
  const reactElement = element as ReactElement<{ children?: ReactNode; from?: string }>
  return [
    ...(reactElement.props.from ? [reactElement.props.from] : []),
    ...Children.toArray(reactElement.props.children).flatMap(collectFromSelectors),
  ]
}
