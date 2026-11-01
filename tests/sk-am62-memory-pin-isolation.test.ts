import { expect, test } from "bun:test"
import { resolve } from "node:path"
import { parsePrebuiltCircuitJson } from "app/parse-prebuilt-circuit-json"
import type { AnyCircuitElement } from "circuit-json"
import { getSourcePortConnectivityMapFromCircuitJson } from "circuit-json-to-connectivity-map"
import { getTiEvm } from "lib/ti-evm-catalog"

type CircuitSourceComponent = AnyCircuitElement & {
  type: "source_component"
  source_component_id: string
}
type CircuitSourcePort = AnyCircuitElement & {
  type: "source_port"
  source_port_id: string
  name: string
}

test("SK-AM62 variants keep U29 address A1 separate from VDDQ", async () => {
  const unexpectedConnections: string[] = []
  for (const variant of getTiEvm("sk-am62").variants) {
    const circuitJson = parsePrebuiltCircuitJson(
      new Uint8Array(
        await Bun.file(
          resolve(import.meta.dir, "../public", variant.circuitJsonUrl.slice(1)),
        ).arrayBuffer(),
      ),
    )
    const memory = circuitJson.find(
      (element): element is CircuitSourceComponent =>
        element.type === "source_component" &&
        element.ftype === "simple_chip" &&
        element.name === "U29" &&
        typeof element.source_component_id === "string",
    )
    if (!memory) throw new Error(`${variant.id}: missing U29`)
    const memoryPorts = circuitJson.filter(
      (element): element is CircuitSourcePort =>
        element.type === "source_port" &&
        element.source_component_id === memory.source_component_id &&
        typeof element.source_port_id === "string" &&
        typeof element.name === "string",
    )
    // Address A1 is ball P7; ball A1 is a VDDQ supply.
    const addressPort = memoryPorts.find(({ name }) => name === "A1")
    const powerPorts = memoryPorts.filter(({ name }) => name === "VDDQ")
    if (!addressPort) throw new Error(`${variant.id}: missing U29 address A1`)
    expect(powerPorts).toHaveLength(10)
    const connectivity = getSourcePortConnectivityMapFromCircuitJson(circuitJson)
    expect(connectivity.getNetConnectedToId(addressPort.source_port_id)).toBeDefined()
    expect(
      powerPorts.every(
        (port) => connectivity.getNetConnectedToId(port.source_port_id) !== undefined,
      ),
    ).toBe(true)
    if (
      powerPorts.some((port) =>
        connectivity.areIdsConnected(addressPort.source_port_id, port.source_port_id),
      )
    ) {
      unexpectedConnections.push(`${variant.id}: U29 address A1 is connected to VDDQ`)
    }
  }
  expect(unexpectedConnections).toEqual([])
}, 120_000)
