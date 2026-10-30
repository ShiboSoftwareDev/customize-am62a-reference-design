import type { FeatureId } from "./types"

export type ComputedCopperPourSettings = {
  clearance: number
  preserveReferenceCopper?: boolean
  removableFeatureId?: FeatureId
  presentFeatureIds?: FeatureId[]
  absentFeatureIds?: FeatureId[]
}
