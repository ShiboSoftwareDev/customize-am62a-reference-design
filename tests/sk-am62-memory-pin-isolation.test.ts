import { expect, test } from "bun:test"
import { resolve } from "node:path"
import { parsePrebuiltCircuitJson } from "app/parse-prebuilt-circuit-json"
import { getSourcePortConnectivityMapFromCircuitJson } from "circuit-json-to-connectivity-map"
import { getTiEvm } from "lib/ti-evm-catalog"
import { getComponentReferencePinIds } from "./fixtures/get-component-reference-pin-ids"

test("SK-AM62 variants keep U29 address A1 separate from VDDQ", async () => {
  const referenceCircuitJson = parsePrebuiltCircuitJson(
    await Bun.file(
      resolve(import.meta.dir, "../lib/generated/ti-evms/sk-am62.source.circuit.json.gz"),
    ).bytes(),
  )
  const unexpectedConnections: string[] = []
  for (const variant of getTiEvm("sk-am62").variants) {
    const circuitJson = parsePrebuiltCircuitJson(
      new Uint8Array(
        await Bun.file(
          resolve(import.meta.dir, "../public", variant.circuitJsonUrl.slice(1)),
        ).arrayBuffer(),
      ),
    )
    // Display labels may be removed when ambiguous; identify each authored pin by placement.
    const referencePinIds = getComponentReferencePinIds({
      circuitJson,
      referenceCircuitJson,
      componentName: "U29",
    })
    // Address A1 is ball P7; ball A1 is a VDDQ supply.
    const addressPortId = referencePinIds.get("A1")?.[0]
    const powerPortIds = referencePinIds.get("VDDQ") ?? []
    if (!addressPortId) throw new Error(`${variant.id}: missing U29 address A1`)
    expect(powerPortIds).toHaveLength(10)
    const connectivity = getSourcePortConnectivityMapFromCircuitJson(circuitJson)
    expect(connectivity.getNetConnectedToId(addressPortId)).toBeDefined()
    expect(
      powerPortIds.every((portId) => connectivity.getNetConnectedToId(portId) !== undefined),
    ).toBe(true)
    if (powerPortIds.some((portId) => connectivity.areIdsConnected(addressPortId, portId))) {
      unexpectedConnections.push(`${variant.id}: U29 address A1 is connected to VDDQ`)
    }
  }
  expect(unexpectedConnections).toEqual([])
}, 120_000)
