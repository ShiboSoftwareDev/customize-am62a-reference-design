import { expect, test } from "bun:test"
import { parameterizeGeneratedBoard } from "../scripts/parameterize-generated-board"

test("generated board TSX is parameterized without selector collisions", () => {
  const generatedSource = `export const ExampleBoard = () => (
  <board routingDisabled>
    <chip name="TP1" footprint={<footprint><smtpad portHints={["1"]} /></footprint>} />
    <chip name="R1" footprint={<footprint>
      <smtpad portHints={["1"]} />
      <pcbcopperpour shape="polygon" layer="top" points={[]} />
    </footprint>} />
    <net name={"TP1"} connectsTo={[".TP1 > .imported_pcb_port_1", ".R1 > .imported_pcb_port_2"]} />
    <net name={"UNROUTED"} />
    <net name={"SIGNAL"} />
    <pcbtrace route={[{"route_type":"wire","x":0,"y":0,"width":0.3,"layer":"top"},{"route_type":"wire","x":1,"y":0,"width":0.3,"layer":"top"}]} />
    <pcbtrace route={[{"route_type":"wire","x":0,"y":1,"width":0.3,"layer":"top"},{"route_type":"wire","x":1,"y":1,"width":0.3,"layer":"top"}]} />
    <via pcbX="0mm" pcbY="0mm" holeDiameter="0.2mm" outerDiameter="0.5mm" fromLayer="top" toLayer="bottom" connectsTo={"net.TP1"} />
    <via pcbX="0mm" pcbY="1mm" holeDiameter="0.2mm" outerDiameter="0.5mm" fromLayer="top" toLayer="bottom" connectsTo={"net.SIGNAL"} />
    <copperpour layer="top" connectsTo={'net[name="TP1"]'} outline={[]} />
    <trace path={[".TP1 > .imported_pcb_port_1", ".R1 > .imported_pcb_port_2", "net.TP1"]} />
  </board>
)
export default ExampleBoard`

  const result = parameterizeGeneratedBoard({
    componentName: "ExampleBoard",
    featureIdByComponentName: new Map([["TP1", "measurement"]]),
    generatedSource,
    importedRoutingMetadata: {
      endpointUsageBySourceNetId: new Map([
        [
          "source_net_0",
          { endpointCountByFeatureId: new Map([["measurement", 1]]), requiredEndpointCount: 1 },
        ],
        [
          "source_net_2",
          { endpointCountByFeatureId: new Map([["measurement", 1]]), requiredEndpointCount: 1 },
        ],
      ]),
      pcbTraceMetadataByRoute: new Map([
        [
          '[{"route_type":"wire","x":0,"y":0,"width":0.3,"layer":"top"},{"route_type":"wire","x":1,"y":0,"width":0.3,"layer":"top"}]',
          { sourceNetId: "source_net_0" },
        ],
        [
          '[{"route_type":"wire","x":0,"y":1,"width":0.3,"layer":"top"},{"route_type":"wire","x":1,"y":1,"width":0.3,"layer":"top"}]',
          { sourceNetId: "source_net_2" },
        ],
      ]),
      sourceNetIdsWithImportedRouting: new Set(["source_net_0", "source_net_2"]),
    },
    portSelectorReplacements: new Map([
      [".TP1 > .imported_pcb_port_1", ".TP1 > .pin1"],
      [".R1 > .imported_pcb_port_2", ".R1 > .pin1"],
    ]),
    routablePortSelectors: new Set([".TP1 > .pin1", ".R1 > .pin1"]),
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

  expect(result.componentNames).toEqual(["TP1", "R1"])
  expect(result.source).toContain(
    'autorouter="auto" autorouterEffortLevel="1x" routeRemaining={false}',
  )
  expect(result.source).not.toContain("autorouterVersion")
  expect(result.source).toContain('name="NET_TP1"')
  expect(result.source).not.toContain('<net name="NET_TP1" connectsTo=')
  expect(result.source).toContain('<net name={"UNROUTED"}')
  expect(result.source).not.toContain("imported_pcb_port")
  expect(result.source).toContain('".TP1 > .pin1"')
  expect(result.source).toContain('"net.NET_TP1"')
  expect(result.source).toContain(
    '{isComponentIncluded({ componentName: "TP1", removedFeatureIds }) && (<chip',
  )
  expect(result.source).toContain("routablePortSelectors.has(selector)")
  expect(result.source).toContain("pcbTeardrops={hasViaTeardrops}")
  expect(result.source).toContain("teardropPortSelectors.has(selector)")
  expect(result.source).toContain("<copperpour")
  expect(result.source.match(/<copperpour/gu)).toHaveLength(1)
  expect(result.source).not.toContain("renderImportedCopperPours")
  expect(result.source).toContain('net[name=\\"NET_TP1\\"]')
  expect(result.source).toContain('source_trace_id: "source_net_0"')
  expect(result.source).toContain('source_trace_id: "source_net_2"')
  expect(result.source).toContain("importedRoutingEndpointUsageBySourceNetId")
  expect(result.source).toContain('sourceNetId: "source_net_2"')
  expect(result.source).toContain('"requiredEndpointCount":2')
  expect(result.source).toContain('"requiredEndpointCount":1')
  expect(result.source).toContain("isImportedRoutingIncluded")
  expect(result.source).toContain('connectsTo={"net.NET_TP1"}')
  expect(result.source).not.toContain("<pcbcopperpour")
})
