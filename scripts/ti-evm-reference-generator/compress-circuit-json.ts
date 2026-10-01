import type { AnyCircuitElement } from "circuit-json"
import { gzipSync, strToU8 } from "fflate"

export function compressCircuitJson(circuitJson: AnyCircuitElement[]): Uint8Array {
  return gzipSync(strToU8(JSON.stringify(circuitJson)), { level: 9, mtime: 0 })
}
