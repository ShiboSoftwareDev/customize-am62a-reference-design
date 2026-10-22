import { expect, test } from "bun:test"
import { parameterizeGeneratedBoard } from "../scripts/parameterize-generated-board"

test("feature-owned copper is conditional while shared copper remains", () => {
  const localCopperPour = `<copperpour layer={"top"} connectsTo={"net[name=\\"OPTIONAL_POWER\\"]"} outline={[{"x":0,"y":0},{"x":1,"y":0},{"x":0,"y":1}]} padMargin={0} traceMargin={0} clearance={0} boardEdgeMargin={0} cutoutMargin={0} useThermalReliefs={false} coveredWithSolderMask={true} />`
  const sharedCopperPour = `<copperpour layer={"bottom"} connectsTo={"net[name=\\"GND\\"]"} outline={[{"x":0,"y":0},{"x":4,"y":0},{"x":0,"y":4}]} padMargin={0} traceMargin={0} clearance={0} boardEdgeMargin={0} cutoutMargin={0} useThermalReliefs={false} coveredWithSolderMask={true} />`
  const generatedSource = `export const ExampleBoard = () => (
  <board routingDisabled>
    <chip name="U1" footprint={<footprint><smtpad portHints={["1"]} /></footprint>} />
    <net name={"OPTIONAL_POWER"} />
    <net name={"GND"} />
    ${localCopperPour}
    ${sharedCopperPour}
  </board>
)
export default ExampleBoard`

  const result = parameterizeGeneratedBoard({
    componentName: "ExampleBoard",
    featureIdByComponentName: new Map([["U1", "optional-interface"]]),
    generatedSource,
    routablePortSelectors: new Set(),
    supportedCopperPours: [
      {
        coveredWithSolderMask: true,
        layer: "top",
        netName: "OPTIONAL_POWER",
        outline: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 0, y: 1 },
        ],
        pcbCopperPourId: "pcb_copper_pour_local",
        removableFeatureId: "optional-interface",
      },
      {
        coveredWithSolderMask: true,
        layer: "bottom",
        netName: "GND",
        outline: [
          { x: 0, y: 0 },
          { x: 4, y: 0 },
          { x: 0, y: 4 },
        ],
        pcbCopperPourId: "pcb_copper_pour_shared",
      },
    ],
    teardropPortSelectors: new Set(),
    viaTeardropPortSelectors: new Set(),
  })

  expect(result.source).toContain(
    `{!removedFeatureIds.has("optional-interface") && (${localCopperPour})}`,
  )
  expect(result.source).toContain(sharedCopperPour)
  expect(result.source).not.toContain(
    `{!removedFeatureIds.has("optional-interface") && (${sharedCopperPour})}`,
  )
})
