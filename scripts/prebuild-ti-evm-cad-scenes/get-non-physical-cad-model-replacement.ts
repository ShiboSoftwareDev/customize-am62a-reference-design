import type { CadModelComponentIdentity, CadModelReplacement } from "./get-cad-model-replacement"

export function getNonPhysicalCadModelReplacement(
  componentIdentity: CadModelComponentIdentity,
): CadModelReplacement | undefined {
  const normalizedComponentName = componentIdentity.componentName.toUpperCase()
  const normalizedFootprint = componentIdentity.altiumFootprint.toUpperCase()
  const isAssemblyMarker = /^(?:FID|MH|MTG|TP)\d/u.test(normalizedComponentName)
  const isMarkerFootprint = /^(?:FIDUCIAL|MTGH|PTH_|TP(?:_|\d))/u.test(normalizedFootprint)
  return isAssemblyMarker || isMarkerFootprint ? { kind: "none" } : undefined
}
