import { expect, test } from "bun:test"
import { parsePrebuiltCircuitJson } from "app/parse-prebuilt-circuit-json"
import { parameterizeGeneratedBoard } from "../scripts/parameterize-generated-board"
import { getImportedPcbTraces } from "../scripts/ti-evm-reference-generator/get-included-imported-routing-element-ids"
import { getImportedRoutingMetadata } from "../scripts/ti-evm-reference-generator/get-imported-routing-metadata"

test("SK-AM62 omits the unassigned flash escape route and via with U9", async () => {
  const reference = parsePrebuiltCircuitJson(
    await Bun.file("lib/generated/ti-evms/sk-am62.source.circuit.json.gz").bytes(),
  )
  const trace = getImportedPcbTraces(reference).find(
    (element) => element.pcb_trace_id === "pcb_pcb_trace_altium_93402",
  )
  const flash = reference.find(
    (element) => element.type === "source_component" && element.name === "U9",
  )
  if (!trace || !flash) throw new Error("Missing SK-AM62 flash fixture")
  const pcbComponent = reference.find(
    (element) =>
      element.type === "pcb_component" && element.source_component_id === flash.source_component_id,
  )
  const [viaEndpoint, padEndpoint] = trace.route
  if (!viaEndpoint || !padEndpoint)
    throw new Error("Expected the flash escape route to connect two wire endpoints")
  const via = reference.find(
    (element) =>
      element.type === "pcb_via" && element.x === viaEndpoint.x && element.y === viaEndpoint.y,
  )
  const pcbPort = reference.find(
    (element) =>
      element.type === "pcb_port" &&
      element.pcb_component_id === pcbComponent?.pcb_component_id &&
      element.x === padEndpoint.x &&
      element.y === padEndpoint.y,
  )
  const pad = reference.find(
    (element) => element.type === "pcb_smtpad" && element.pcb_port_id === pcbPort?.pcb_port_id,
  )
  if (!pcbComponent || !via || !pcbPort || !pad) throw new Error("Incomplete flash escape fixture")
  expect(trace.source_trace_id).toBeUndefined()
  expect(via.source_net_id).toBeUndefined()
  const circuitJson = [flash, pcbComponent, pcbPort, pad, trace, via]

  const featureIdByComponentName = new Map([["U9", "secondary-storage"]])
  const importedRoutingMetadata = getImportedRoutingMetadata({
    circuitJson,
    featureIdByComponentName,
    removedFeatureIdCombinations: [[], ["secondary-storage"]],
  })
  const { source } = parameterizeGeneratedBoard({
    componentName: "FlashEscape",
    featureIdByComponentName,
    generatedSource: `export default () => (
      <board pcbX={0} pcbY={0} width="100mm" height="150mm">
        <chip name="U9" />
        <pcbtrace route={${JSON.stringify(trace.route)}} />
        <via pcbX="${via.x}mm" pcbY="${via.y}mm" holeDiameter="0.2mm" outerDiameter="0.45mm" />
      </board>
    )`,
    importedRoutingMetadata,
    routablePortSelectors: new Set(),
    teardropPortSelectors: new Set(),
    viaTeardropPortSelectors: new Set(),
  })

  const fullBoardOnly =
    "isImportedRoutingElementIncluded({ inclusionMask: 1n, removedFeatureCombinationIndex })"
  expect(source).toContain(`${fullBoardOnly} && (<pcbtrace route=`)
  expect(source).toContain(`${fullBoardOnly} && (<via pcbX=`)
})
