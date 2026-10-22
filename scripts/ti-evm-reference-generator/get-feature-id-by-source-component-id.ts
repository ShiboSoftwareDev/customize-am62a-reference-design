import type { AnyCircuitElement } from "circuit-json"
import { isSourceComponent } from "./circuit-json-elements"
import type { ComponentName, FeatureId, SourceComponentId } from "./types"

export function getFeatureIdBySourceComponentId(params: {
  circuitJson: AnyCircuitElement[]
  featureIdByComponentName: ReadonlyMap<ComponentName, FeatureId>
}): Map<SourceComponentId, FeatureId> {
  return new Map(
    params.circuitJson.filter(isSourceComponent).flatMap((sourceComponent) => {
      const featureId = params.featureIdByComponentName.get(sourceComponent.name)
      return featureId ? [[sourceComponent.source_component_id, featureId]] : []
    }),
  )
}
