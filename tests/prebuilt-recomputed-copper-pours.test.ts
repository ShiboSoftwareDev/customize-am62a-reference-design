import { expect, test } from "bun:test"
import { resolve } from "node:path"
import type { AnyCircuitElement } from "circuit-json"
import { parsePrebuiltCircuitJson } from "../app/parse-prebuilt-circuit-json"
import { tiEvms } from "../lib/ti-evm-catalog"
import { isRecomputedCopperPour } from "../scripts/prebuild-ti-evm-assets/recompute-copper-pours"
import { getRecomputedCopperPourDefinitions } from "../scripts/prebuild-ti-evm-assets/recomputed-copper-pour-config"

type PcbCopperPourElement = AnyCircuitElement & {
  layer: string
  source_net_id?: string
  type: "pcb_copper_pour"
}

type SourceNetElement = AnyCircuitElement & {
  name: string
  source_net_id: string
  type: "source_net"
}

test("all variants cache their configured recomputed ground pours", async () => {
  for (const evm of tiEvms) {
    const definitions = getRecomputedCopperPourDefinitions(evm.id)

    for (const variant of evm.variants) {
      const circuitJson = await loadCircuitJson(variant.circuitJsonUrl)

      for (const definition of definitions) {
        const sourceNet = circuitJson.find(
          (element): element is SourceNetElement =>
            element.type === "source_net" && element.name === definition.sourceNetName,
        )
        if (!sourceNet) {
          throw new Error(`${evm.name} ${variant.label} is missing ${definition.sourceNetName}`)
        }

        const targetPours = circuitJson.filter(
          (element): element is PcbCopperPourElement =>
            element.type === "pcb_copper_pour" &&
            element.layer === definition.layer &&
            element.source_net_id === sourceNet.source_net_id,
        )

        const recomputedPours = targetPours.filter(isRecomputedCopperPour)
        expect(recomputedPours.length).toBeGreaterThan(0)
        expect(recomputedPours.every((pour) => pour.shape === "brep")).toBe(true)
        expect(targetPours.some((pour) => !isRecomputedCopperPour(pour))).toBe(true)
      }
    }
  }
}, 30_000)

async function loadCircuitJson(publicUrl: string): Promise<AnyCircuitElement[]> {
  const path = resolve(import.meta.dir, "..", "public", publicUrl.replace(/^\//u, ""))
  const bytes = new Uint8Array(await Bun.file(path).arrayBuffer())
  return parsePrebuiltCircuitJson(bytes)
}
