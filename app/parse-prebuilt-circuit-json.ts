import { gunzipSync } from "fflate"
import type { AnyCircuitElement } from "circuit-json"

export function parsePrebuiltCircuitJson(bytes: Uint8Array): AnyCircuitElement[] {
  const isGzip = bytes[0] === 0x1f && bytes[1] === 0x8b
  const jsonBytes = isGzip ? gunzipSync(bytes) : bytes
  return JSON.parse(new TextDecoder().decode(jsonBytes)) as AnyCircuitElement[]
}
