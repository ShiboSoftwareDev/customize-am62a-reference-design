import { expect, test } from "bun:test"
import { resolve } from "node:path"
import { parsePrebuiltCircuitJson } from "app/parse-prebuilt-circuit-json"
import { getSourcePortConnectivityMapFromCircuitJson } from "circuit-json-to-connectivity-map"
import { getTiEvm } from "lib/ti-evm-catalog"
import { getComponentReferencePinIds } from "./fixtures/get-component-reference-pin-ids"

test("SK-AM62 variants preserve independent PHY VDDA1P8 pins", async () => {
  const referenceCircuitJson = parsePrebuiltCircuitJson(
    await Bun.file(
      resolve(import.meta.dir, "../lib/generated/ti-evms/sk-am62.source.circuit.json.gz"),
    ).bytes(),
  )
  for (const variant of getTiEvm("sk-am62").variants) {
    const circuitJson = parsePrebuiltCircuitJson(
      await Bun.file(
        resolve(import.meta.dir, "../public", variant.circuitJsonUrl.slice(1)),
      ).bytes(),
    )
    const connectivity = getSourcePortConnectivityMapFromCircuitJson(circuitJson)
    for (const componentName of ["U49", "U51"]) {
      const hasPhy = circuitJson.some(
        (element) => element.type === "source_component" && element.name === componentName,
      )
      expect(hasPhy).toBe(!variant.removedFeatureIds.includes("connectivity"))
      if (!hasPhy) continue
      const referencePinIds = getComponentReferencePinIds({
        circuitJson,
        referenceCircuitJson,
        componentName,
      })
      const powerPinIds = referencePinIds.get("VDDA1P8") ?? []
      expect(powerPinIds).toHaveLength(2)
      const firstPinId = powerPinIds[0]
      const secondPinId = powerPinIds[1]
      if (!firstPinId || !secondPinId) throw new Error(`${variant.id}: missing PHY power pins`)
      expect(connectivity.getNetConnectedToId(firstPinId)).toBeDefined()
      expect(connectivity.getNetConnectedToId(secondPinId)).toBeDefined()
      expect(connectivity.areIdsConnected(firstPinId, secondPinId)).toBe(false)
    }
  }
}, 120_000)
