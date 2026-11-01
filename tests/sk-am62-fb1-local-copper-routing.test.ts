import { expect, test } from "bun:test"
import "bun-match-svg"
import type { AnyCircuitElement } from "circuit-json"
import { getFullConnectivityMapFromCircuitJson } from "circuit-json-to-connectivity-map"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import {
  getBaselineDanglingEndpointKeys,
  getImportedPcbTraces,
  getImportedPcbVias,
  getIncidentPcbTraceIdsByViaId,
  getIncludedImportedRoutingElementIds,
} from "../scripts/ti-evm-reference-generator/get-included-imported-routing-element-ids"
import { getRoutingConnectivityCheckCircuitJson } from "../scripts/ti-evm-reference-generator/get-routing-connectivity-check-circuit-json"

const multimediaComponentIds = new Set([
  "schematic_41_source_component_altium_1658", // FB1
  "schematic_41_source_component_altium_3389", // C204
])

test("removing SK-AM62 multimedia removes its local copper and newly dangling FB1 routes", async () => {
  const source = (await Bun.file(
    new URL("./fixtures/sk-am62-fb1-local-copper.circuit.json", import.meta.url),
  ).json()) as AnyCircuitElement[]
  const normalized = getRoutingConnectivityCheckCircuitJson({
    circuitJson: source,
    featureIdBySourceComponentId: new Map(
      [...multimediaComponentIds].map((componentId) => [componentId, "multimedia"]),
    ),
  })
  const pcbTraces = getImportedPcbTraces(normalized)
  const pcbVias = getImportedPcbVias(normalized)
  const connectivityMap = getFullConnectivityMapFromCircuitJson(normalized)
  const routing = getIncludedImportedRoutingElementIds({
    circuitJson: normalized,
    connectivityMap,
    pcbTraces,
    pcbVias,
    baselineDanglingEndpointKeys: getBaselineDanglingEndpointKeys(normalized, connectivityMap),
    incidentPcbTraceIdsByViaId: getIncidentPcbTraceIdsByViaId({ pcbTraces, pcbVias }),
    removedSourceComponentIds: multimediaComponentIds,
  })
  const removedPcbComponentIds = new Set(
    normalized.flatMap((element) =>
      element.type === "pcb_component" &&
      typeof element.source_component_id === "string" &&
      typeof element.pcb_component_id === "string" &&
      multimediaComponentIds.has(element.source_component_id)
        ? [element.pcb_component_id]
        : [],
    ),
  )
  const withoutMultimedia = normalized.filter((element) => {
    if (
      "pcb_component_id" in element &&
      typeof element.pcb_component_id === "string" &&
      removedPcbComponentIds.has(element.pcb_component_id)
    )
      return false
    if (element.type === "pcb_trace" && typeof element.pcb_trace_id === "string")
      return routing.includedPcbTraceIds.has(element.pcb_trace_id)
    if (element.type === "pcb_via" && typeof element.pcb_via_id === "string")
      return routing.includedPcbViaIds.has(element.pcb_via_id)
    return true
  })
  await expect(
    convertCircuitJsonToPcbSvg(withoutMultimedia, {
      layer: "bottom",
      hiddenLayerOpacity: 0,
      showSolderMask: false,
      includeVersion: false,
      viewport: { minX: 4, maxX: 10, minY: 111.55, maxY: 117.05 },
    }),
  ).toMatchSvgSnapshot(import.meta.path, "without-multimedia")

  const localPour = normalized.find(
    (element) =>
      element.type === "pcb_copper_pour" &&
      element.pcb_copper_pour_id === "pcb_pcb_copper_pour_altium_polygon_68",
  )
  expect(localPour).toHaveProperty("pcb_component_id", "pcb_pcb_component_altium_304")
  expect(withoutMultimedia.filter((element) => element.type === "pcb_copper_pour")).toEqual([])
  expect(routing.includedPcbTraceIds.has("pcb_pcb_trace_altium_168342")).toBe(false)
  expect(routing.includedPcbTraceIds.has("pcb_pcb_trace_altium_171518")).toBe(false)
})
