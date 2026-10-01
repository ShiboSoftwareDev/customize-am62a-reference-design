import { expect, test } from "bun:test"
import { parameterizeGeneratedBoard } from "../scripts/parameterize-generated-board"

test("generated board TSX is parameterized without selector collisions", () => {
  const generatedSource = `export default () => (
  <board routingDisabled>
    <chip name="TP1" footprint={<footprint><smtpad portHints={["1"]} /></footprint>} />
    <chip name="R1" footprint={<footprint><smtpad portHints={["1"]} /></footprint>} />
    <net name="TP1" />
    <trace path={[".TP1 > .pin1", ".R1 > .pin1", "net.TP1"]} />
  </board>
)`

  const result = parameterizeGeneratedBoard({
    autorouterVersion: "beta_pipeline9",
    componentName: "ExampleBoard",
    featureIdByComponentName: new Map([["TP1", "measurement"]]),
    generatedSource,
    routablePortSelectors: new Set([".TP1 > .pin1", ".R1 > .pin1"]),
    teardropPortSelectors: new Set([".R1 > .pin1"]),
    viaTeardropPortSelectors: new Set([".TP1 > .pin1", ".R1 > .pin1"]),
  })

  expect(result.componentNames).toEqual(["TP1", "R1"])
  expect(result.source).toContain('autorouterVersion="beta_pipeline9"')
  expect(result.source).toContain('name="NET_TP1"')
  expect(result.source).toContain('"net.NET_TP1"')
  expect(result.source).toContain(
    '{isComponentIncluded({ componentName: "TP1", removedFeatureIds }) && (<chip',
  )
  expect(result.source).toContain("routablePortSelectors.has(selector)")
  expect(result.source).toContain("pcbTeardrops={hasViaTeardrops}")
  expect(result.source).toContain("teardropPortSelectors.has(selector)")
})
