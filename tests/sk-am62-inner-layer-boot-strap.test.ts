import { expect, test } from "bun:test"
import { parsePrebuiltCircuitJson } from "app/parse-prebuilt-circuit-json"
import { getImportedRoutingMetadata } from "../scripts/ti-evm-reference-generator/get-imported-routing-metadata"

test("SK-AM62 keeps the inner-layer boot strap route when the PRU header is omitted", async () => {
  const reference = parsePrebuiltCircuitJson(
    await Bun.file("lib/generated/ti-evms/sk-am62.source.circuit.json.gz").bytes(),
  )
  const strapNet = reference.find(
    (element) => element.type === "source_net" && element.name === "PR0_PRU0_GPO0",
  )
  const strapTrace = reference.find(
    (element) =>
      element.type === "source_trace" &&
      Array.isArray(element.connected_source_net_ids) &&
      element.connected_source_net_ids.includes(strapNet?.source_net_id),
  )
  if (!strapNet || !strapTrace || !Array.isArray(strapTrace.connected_source_port_ids)) {
    throw new Error("Missing the reference boot strap net")
  }
  const sourcePortIds = new Set(strapTrace.connected_source_port_ids)
  const pcbPorts = reference.filter(
    (element) => element.type === "pcb_port" && sourcePortIds.has(element.source_port_id),
  )
  const pcbPortIds = new Set(pcbPorts.map(({ pcb_port_id }) => pcb_port_id))
  const pcbComponentIds = new Set(pcbPorts.map(({ pcb_component_id }) => pcb_component_id))
  const pcbComponents = reference.filter(
    (element) => element.type === "pcb_component" && pcbComponentIds.has(element.pcb_component_id),
  )
  const sourceComponentIds = new Set(
    pcbComponents.map(({ source_component_id }) => source_component_id),
  )
  const circuitJson = reference.filter((element) => {
    if (element === strapNet || element === strapTrace || element.type === "pcb_board") return true
    if (element.type === "source_component")
      return sourceComponentIds.has(element.source_component_id)
    if (element.type === "source_port") return sourcePortIds.has(element.source_port_id)
    if (element.type === "pcb_component") return pcbComponentIds.has(element.pcb_component_id)
    if (element.type === "pcb_port") return pcbPortIds.has(element.pcb_port_id)
    if (element.type === "pcb_plated_hole" || element.type === "pcb_smtpad")
      return pcbPortIds.has(element.pcb_port_id)
    if (element.type === "pcb_trace") return element.source_trace_id === strapTrace.source_trace_id
    if (element.type === "pcb_via")
      return (
        element.source_net_id === strapNet.source_net_id ||
        element.source_trace_id === strapTrace.source_trace_id
      )
    return false
  })

  const metadata = getImportedRoutingMetadata({
    circuitJson,
    featureIdByComponentName: new Map([["J10", "expansion"]]),
    removedFeatureIdCombinations: [[], ["expansion"]],
  })

  expect(metadata.bridgeVias).toHaveLength(1)
  expect(metadata.bridgeVias[0]?.inclusionMask).toBe(2n)
  expect(metadata.bridgeVias[0]?.x).toBeCloseTo(25.737058, 6)
  expect(metadata.bridgeVias[0]?.y).toBeCloseTo(45.706538, 6)
  const preservedRoutes = [...metadata.pcbTraceMetadataByRoute].filter(
    ([, { inclusionMask }]) => inclusionMask === 3n,
  )
  expect(preservedRoutes.some(([route]) => route.includes('"layer":"inner2"'))).toBe(true)
  expect(preservedRoutes.some(([route]) => route.includes('"layer":"inner7"'))).toBe(true)
})
