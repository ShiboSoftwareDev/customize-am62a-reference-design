import { getConnectorCadModelReplacement } from "./get-connector-cad-model-replacement"
import { getMechanicalConnectorCadModelReplacement } from "./get-mechanical-connector-cad-model-replacement"
import { getStandardPackageCadModelReplacement } from "./get-standard-package-cad-model-replacement"
import type { JscadOperation } from "jscad-planner"

export type CadModelComponentIdentity = {
  altiumFootprint: string
  componentName: string
  manufacturerPartNumber?: string
}

export type CadModelReplacement =
  | {
      kind: "footprinter"
      footprinterString: string
    }
  | {
      kind: "jscad"
      jscadOperations: JscadOperation[]
    }

export function getCadModelReplacement(
  componentIdentity: CadModelComponentIdentity,
): CadModelReplacement | undefined {
  return (
    getStandardPackageCadModelReplacement(componentIdentity) ??
    getMechanicalConnectorCadModelReplacement(componentIdentity) ??
    getConnectorCadModelReplacement(componentIdentity)
  )
}
