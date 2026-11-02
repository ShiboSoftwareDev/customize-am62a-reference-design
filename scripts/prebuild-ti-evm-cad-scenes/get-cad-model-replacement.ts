import { getConnectorCadModelReplacement } from "./get-connector-cad-model-replacement"
import { getMechanicalConnectorCadModelReplacement } from "./get-mechanical-connector-cad-model-replacement"
import { getNonPhysicalCadModelReplacement } from "./get-non-physical-cad-model-replacement"
import { getStandardPackageCadModelReplacement } from "./get-standard-package-cad-model-replacement"
import type { JscadOperation } from "jscad-planner"
import type { ModelLocalPad } from "./get-model-local-pads"
import { getFpcCadModelReplacement } from "./get-fpc-cad-model-replacement"
import { getMicroSdCadModelReplacement } from "./get-micro-sd-cad-model-replacement"

export type CadModelComponentIdentity = {
  altiumFootprint: string
  componentName: string
  manufacturerPartNumber?: string
}

export type CadModelPlanarOffsetMillimeters = {
  x: number
  y: number
}

type CadModelPlacement = {
  /** Numbered reference pads, used to register a package to the imported pads. */
  modelFootprintString?: string
  modelPinPositions?: Array<{ x: number; y: number; pinNumber: string }>
  modelXRotationDegrees?: number
  modelBoardNormalDirection?: "x+" | "x-" | "y+" | "y-" | "z+" | "z-"
  modelOriginPosition?: { x: number; y: number; z: number }
  modelVerticalOffsetMillimeters?: number
}

export type CadModelReplacement = CadModelPlacement &
  (
    | {
        kind: "none"
      }
    | {
        kind: "footprinter"
        footprinterString: string
        /** Rotation around the board normal after applying the PCB component rotation. */
        modelYawOffsetDegrees?: number
      }
    | {
        kind: "glb"
        modelGlbUrl: string
        modelPlanarOffsetMillimeters?: CadModelPlanarOffsetMillimeters
        modelUnitToMmScaleFactor: number
        modelVerticalOffsetMillimeters?: number
        /** Rotation around the board normal after applying the PCB component rotation. */
        modelYawOffsetDegrees?: number
      }
    | {
        kind: "jscad"
        jscadOperations: JscadOperation[]
        /** Model-local XY offset applied before board-side mirroring and yaw. */
        modelPlanarOffsetMillimeters?: CadModelPlanarOffsetMillimeters
        /** Rotation around the board normal after applying the PCB component rotation. */
        modelYawOffsetDegrees?: number
      }
    | {
        kind: "step"
        modelStepUrl: string
        /** Model-local XY offset applied before board-side mirroring and yaw. */
        modelPlanarOffsetMillimeters?: CadModelPlanarOffsetMillimeters
        /** Rotation around the board normal after applying the PCB component rotation. */
        modelYawOffsetDegrees?: number
      }
  )

export function getCadModelReplacement(
  componentIdentity: CadModelComponentIdentity,
  modelLocalPads: ModelLocalPad[] = [],
): CadModelReplacement | undefined {
  return (
    getNonPhysicalCadModelReplacement(componentIdentity) ??
    getStandardPackageCadModelReplacement(componentIdentity, modelLocalPads) ??
    getFpcCadModelReplacement(componentIdentity, modelLocalPads) ??
    getMicroSdCadModelReplacement(componentIdentity, modelLocalPads) ??
    getMechanicalConnectorCadModelReplacement(componentIdentity) ??
    getConnectorCadModelReplacement(componentIdentity)
  )
}
