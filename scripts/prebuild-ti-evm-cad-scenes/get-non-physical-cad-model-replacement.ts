import type { CadModelComponentIdentity, CadModelReplacement } from "./get-cad-model-replacement"

export function getNonPhysicalCadModelReplacement(
  componentIdentity: CadModelComponentIdentity,
): CadModelReplacement | undefined {
  const normalizedComponentName = componentIdentity.componentName.toUpperCase()
  const normalizedFootprint = componentIdentity.altiumFootprint.toUpperCase()
  const isAssemblyMarker = /^(?:FID|MH|MTG|TP)\d/u.test(normalizedComponentName)
  const isMarkerFootprint = /^(?:FIDUCIAL|MTGH|PTH_|TP(?:_|\d))/u.test(normalizedFootprint)
  const isSkAm62BgaAssemblyEnvelope = normalizedFootprint === "BGASKT425_C21135_720X720_9-7"
  return isAssemblyMarker || isMarkerFootprint || isSkAm62BgaAssemblyEnvelope
    ? { kind: "none" }
    : undefined
}
