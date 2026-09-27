import type { BoardRenderRequest } from "../api-types"
import { normalizeOptionalModuleSelection } from "../module-config"

export function normalizeRenderRequest(candidate: unknown): BoardRenderRequest {
  const candidateRecord =
    candidate && typeof candidate === "object" ? (candidate as Record<string, unknown>) : {}

  return {
    selection: normalizeOptionalModuleSelection(candidateRecord.selection),
    addPours: candidateRecord.addPours === true,
  }
}
