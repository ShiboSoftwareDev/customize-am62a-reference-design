import { expect, test } from "bun:test"
import { parameterizeGeneratedBoard } from "../scripts/parameterize-generated-board"

test("parameterizes selectors for chips with child CAD models", () => {
  const generatedSource = `export const ExampleBoard = () => (
  <board routingDisabled>
    <chip name="J1" pinLabels={{"pin1":["1","pin1","imported_pcb_port_1"]}} footprint={<footprint><platedhole portHints={["imported_pcb_port_1"]} /></footprint>}>
      <cadmodel modelUrl={"/models/j1.step"} />
    </chip>
    <net name={"VIN"} connectsTo={[".J1 > .imported_pcb_port_1"]} />
    <trace path={[".J1 > .imported_pcb_port_1", "net.VIN"]} />
  </board>
)
export default ExampleBoard`

  const result = parameterizeGeneratedBoard({
    componentName: "ExampleBoard",
    featureIdByComponentName: new Map([["J1", "input-connector"]]),
    generatedSource,
    routablePortSelectors: new Set([".J1 > .pin1"]),
    teardropPortSelectors: new Set(),
    viaTeardropPortSelectors: new Set(),
  })

  expect(result.componentNames).toEqual(["J1"])
  expect(result.source).toContain(
    '{isComponentIncluded({ componentName: "J1", removedFeatureIds }) && (<chip',
  )
  expect(result.source).toContain(
    '<ParameterizedNet removedFeatureIds={removedFeatureIds} name="VIN" connectsTo={[".J1 > .pin1"]} />',
  )
  expect(result.source).toContain('path={[".J1 > .pin1", "net.VIN"]}')
  expect(result.source).toContain('<cadmodel modelUrl={"/models/j1.step"} />')
})
