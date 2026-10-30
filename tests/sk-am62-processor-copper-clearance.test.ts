import { expect, test } from "bun:test"
import { parsePrebuiltCircuitJson } from "../app/parse-prebuilt-circuit-json"
import { getFullConnectivityMapFromCircuitJson } from "circuit-json-to-connectivity-map"
import { getTiEvm } from "../lib/ti-evm-catalog"
import { copperContainsPoint } from "./fixtures/copper-contains-point"

type PcbPortId = string
type SourcePortId = string

test("every SK-AM62 variant keeps unrelated copper clear of all 425 U12 processor pads", async () => {
  for (const variant of getTiEvm("sk-am62").variants) {
    const circuitJson = parsePrebuiltCircuitJson(
      new Uint8Array(
        await Bun.file(`${import.meta.dir}/../public${variant.circuitJsonUrl}`).arrayBuffer(),
      ),
    )
    const sourceComponent = circuitJson.find(
      (element) => element.type === "source_component" && element.name === "U12",
    )
    expect(sourceComponent).toBeDefined()
    const component = circuitJson.find(
      (element) =>
        element.type === "pcb_component" &&
        element.source_component_id === sourceComponent?.source_component_id,
    )
    expect(component).toBeDefined()
    const pcbPorts = new Map<PcbPortId, SourcePortId>(
      circuitJson.flatMap((element) =>
        element.type === "pcb_port" &&
        typeof element.pcb_port_id === "string" &&
        typeof element.source_port_id === "string"
          ? [[element.pcb_port_id, element.source_port_id] as const]
          : [],
      ),
    )
    const connectivity = getFullConnectivityMapFromCircuitJson(circuitJson)
    const pads = circuitJson.filter(
      (element) =>
        element.type === "pcb_smtpad" && element.pcb_component_id === component?.pcb_component_id,
    )
    expect(pads, variant.id).toHaveLength(425)
    const coveredPadIds: string[] = []
    for (const pad of pads) {
      // Polygon SMT pads elsewhere on this board have points instead of x/y.
      // Never feed undefined coordinates to a containment check.
      if (
        typeof pad.x !== "number" ||
        typeof pad.y !== "number" ||
        typeof pad.pcb_port_id !== "string" ||
        typeof pad.pcb_smtpad_id !== "string" ||
        typeof pad.layer !== "string"
      )
        throw new Error(`U12 pad has no center or port: ${pad.pcb_smtpad_id}`)
      const sourcePortId = pcbPorts.get(pad.pcb_port_id)
      if (!sourcePortId) throw new Error(`U12 pad has no source port: ${pad.pcb_smtpad_id}`)
      const padNet = connectivity.getNetConnectedToId(sourcePortId)
      expect(padNet).toBeDefined()
      const unrelatedCopper = circuitJson.filter(
        (element) =>
          element.type === "pcb_copper_pour" &&
          (typeof element.source_net_id !== "string" ||
            connectivity.getNetConnectedToId(element.source_net_id) !== padNet),
      )
      if (
        copperContainsPoint({
          circuitJson: unrelatedCopper,
          point: { x: pad.x, y: pad.y },
          layer: pad.layer,
        })
      )
        coveredPadIds.push(pad.pcb_smtpad_id)
    }
    expect(coveredPadIds, variant.id).toEqual([])
  }
}, 120_000)
