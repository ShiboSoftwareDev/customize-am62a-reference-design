import type { AnyCircuitElement } from "circuit-json"
import { gunzipSync, strFromU8 } from "fflate"

export function parsePrebuiltCircuitJson(compressedBytes: Uint8Array): AnyCircuitElement[] {
  const isGzip = compressedBytes[0] === 0x1f && compressedBytes[1] === 0x8b
  const circuitJsonText = strFromU8(isGzip ? gunzipSync(compressedBytes) : compressedBytes)
  const circuitJson = JSON.parse(circuitJsonText)
  if (!Array.isArray(circuitJson)) throw new Error("Prebuilt board is not Circuit JSON")
  return circuitJson as AnyCircuitElement[]
}
