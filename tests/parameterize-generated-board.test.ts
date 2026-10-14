import { expect, test } from "bun:test"
import { parameterizeGeneratedBoard } from "../scripts/parameterize-generated-board"

test("generated board TSX is parameterized without selector collisions", () => {
  const generatedSource = `export const ExampleBoard = () => (
  <board routingDisabled>
    <chip name="TP1" pinLabels={{"pin1":["1","pin1","imported_pcb_port_1"]}} footprint={<footprint><smtpad portHints={["imported_pcb_port_1"]} /></footprint>} />
    <chip name="R1" pinLabels={{"pin1":["1","pin1","imported_pcb_port_2"]}} footprint={<footprint>
      <smtpad portHints={["1"]} />
      <pcbcopperpour shape="polygon" layer="top" points={[]} />
    </footprint>} />
    <chip name="J1" pinLabels={{"pin2":["S1","imported_pcb_port_3"]}} footprint={<footprint><platedhole portHints={["imported_pcb_port_3"]} /></footprint>} />
    <net name={"TP1"} connectsTo={[".TP1 > .imported_pcb_port_1", ".R1 > .imported_pcb_port_2", ".J1 > .imported_pcb_port_3"]} />
    <copperpour layer="top" connectsTo="net.TP1" outline={[]} />
    <trace path={[".TP1 > .imported_pcb_port_1", ".R1 > .imported_pcb_port_2", "net.TP1"]} />
  </board>
)
export default ExampleBoard`

  const result = parameterizeGeneratedBoard({
    componentName: "ExampleBoard",
    featureIdByComponentName: new Map([["TP1", "measurement"]]),
    generatedSource,
    routablePortSelectors: new Set([".TP1 > .pin1", ".R1 > .pin1", ".J1 > .S1"]),
    supportedCopperPours: [
      {
        coveredWithSolderMask: true,
        layer: "top",
        netName: "TP1",
        outline: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 1, y: 1 },
        ],
      },
    ],
    teardropPortSelectors: new Set([".R1 > .pin1"]),
    viaTeardropPortSelectors: new Set([".TP1 > .pin1", ".R1 > .pin1"]),
  })

  expect(result.componentNames).toEqual(["TP1", "R1", "J1"])
  expect(result.source).toContain('autorouter="auto" autorouterEffortLevel="1x" routeRemaining')
  expect(result.source).not.toContain("autorouterVersion")
  expect(result.source).toContain('name="NET_TP1"')
  expect(result.source).toContain('"net.NET_TP1"')
  expect(result.source).toContain(
    '{isComponentIncluded({ componentName: "TP1", removedFeatureIds }) && (<chip',
  )
  expect(result.source).toContain("routablePortSelectors.has(selector)")
  expect(result.source).toContain(
    '<ParameterizedNet removedFeatureIds={removedFeatureIds} name="NET_TP1" connectsTo={[".TP1 > .pin1",".R1 > .pin1",".J1 > .S1"]} />',
  )
  expect(result.source).toContain(
    "return <net name={props.name} connectsTo={includedPortSelectors} />",
  )
  expect(result.source).toContain('path={[".TP1 > .pin1", ".R1 > .pin1", "net.NET_TP1"]}')
  expect(result.source).not.toContain('connectsTo={[".TP1 > .imported_pcb_port_1"')
  expect(result.source).toContain("pcbTeardrops={hasViaTeardrops}")
  expect(result.source).toContain("teardropPortSelectors.has(selector)")
  expect(result.source).toContain("<copperpour")
  expect(result.source.match(/<copperpour\b/gu)).toHaveLength(1)
  expect(result.source).not.toContain("renderImportedCopperPours")
  expect(result.source).toContain('net[name=\\"NET_TP1\\"]')
  expect(result.source).not.toContain("<pcbcopperpour")
})
