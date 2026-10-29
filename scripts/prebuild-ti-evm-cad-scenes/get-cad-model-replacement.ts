import { getConnectorCadModelReplacement } from "./get-connector-cad-model-replacement"
import { getMechanicalConnectorCadModelReplacement } from "./get-mechanical-connector-cad-model-replacement"
import { getNonPhysicalCadModelReplacement } from "./get-non-physical-cad-model-replacement"
import { getStandardPackageCadModelReplacement } from "./get-standard-package-cad-model-replacement"
import type { JscadOperation } from "jscad-planner"

export type CadModelComponentIdentity = {
  altiumFootprint: string
  componentName: string
  manufacturerPartNumber?: string
}

export type CadModelReplacement =
  | {
      kind: "none"
    }
  | {
      kind: "footprinter"
      footprinterString: string
    }
  | {
      kind: "jscad"
      jscadOperations: JscadOperation[]
      /** Rotation around the board normal after applying the PCB component rotation. */
      modelYawOffsetDegrees?: number
    }

export function getCadModelReplacement(
  componentIdentity: CadModelComponentIdentity,
): CadModelReplacement | undefined {
  return (
    getNonPhysicalCadModelReplacement(componentIdentity) ??
    getStandardPackageCadModelReplacement(componentIdentity) ??
    getMechanicalConnectorCadModelReplacement(componentIdentity) ??
    getConnectorCadModelReplacement(componentIdentity)
  )
}
