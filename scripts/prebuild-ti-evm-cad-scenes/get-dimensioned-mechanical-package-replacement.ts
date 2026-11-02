import type { CadModelComponentIdentity, CadModelReplacement } from "./get-cad-model-replacement"
import {
  createMetalCanCadModel,
  createShieldedInductorCadModel,
  createTantalumCapacitorCadModel,
  createWifiModuleCadModel,
} from "./create-dimensioned-package-cad-models"
import { getPackageBodyDimensionsMillimeters } from "./get-package-body-dimensions"
import type { ModelLocalPad } from "./get-model-local-pads"
import { getPackageHeightMillimeters } from "./get-package-height-millimeters"
import { createSmdElectrolyticCapacitorCadModel } from "./create-smd-electrolytic-capacitor-cad-model"
import { getCrystalCadModelReplacement } from "./get-crystal-cad-model-replacement"

function createJscadReplacement(
  jscadOperations: Extract<CadModelReplacement, { kind: "jscad" }>["jscadOperations"],
): CadModelReplacement {
  return { kind: "jscad", jscadOperations }
}

function getMetricInductorDimensions(
  normalizedFootprint: string,
): { x: number; y: number } | undefined {
  // BeaglePlay's L1008 is an imperial package (CODACA CSTB252012H),
  // unlike its L2012/L2016 metric library names.
  if (normalizedFootprint === "L1008") return { x: 2.5, y: 2 }
  const metricSize = /^L(\d{2})(\d{2})$/u.exec(normalizedFootprint)
  if (metricSize) return { x: Number(metricSize[1]) / 10, y: Number(metricSize[2]) / 10 }
  if (/^IND0806/u.test(normalizedFootprint)) return { x: 2, y: 1.6 }
  if (/^L4P_2D54/u.test(normalizedFootprint)) return { x: 9.2, y: 6 }
  if (/^2520$/u.test(normalizedFootprint)) return { x: 2.5, y: 2 }
  return undefined
}

function getInductorHeight(normalizedFootprint: string): number | undefined {
  if (normalizedFootprint === "L1008") return 1.2
  if (/^L4P_2D54/u.test(normalizedFootprint)) return 5
  return undefined
}

function getKnownTantalumDimensions(
  normalizedFootprint: string,
): { height: number; length: number; width: number } | undefined {
  if (/^CAPT7343/u.test(normalizedFootprint)) return { length: 7.3, width: 4.3, height: 3.1 }
  if (/^CAPAE_FCASE/u.test(normalizedFootprint)) return { length: 7.3, width: 4.3, height: 4.3 }
  return undefined
}

export function getDimensionedMechanicalPackageReplacement(
  componentIdentity: CadModelComponentIdentity,
  modelLocalPads: ModelLocalPad[] = [],
): CadModelReplacement | undefined {
  const normalizedFootprint = componentIdentity.altiumFootprint.trim().toUpperCase()
  const bodyDimensions = getPackageBodyDimensionsMillimeters(normalizedFootprint)

  if (/^MOD100_WL18/u.test(normalizedFootprint)) {
    return createJscadReplacement(createWifiModuleCadModel(modelLocalPads))
  }
  if (componentIdentity.componentName.startsWith("L")) {
    const inductorDimensions = bodyDimensions ?? getMetricInductorDimensions(normalizedFootprint)
    if (inductorDimensions) {
      return createJscadReplacement(
        createShieldedInductorCadModel({
          length: inductorDimensions.x,
          width: inductorDimensions.y,
          height: getInductorHeight(normalizedFootprint),
        }),
      )
    }
  }
  if (/^(?:OSC|X\d|XTAL)/u.test(normalizedFootprint)) {
    const crystalReplacement = getCrystalCadModelReplacement(componentIdentity, modelLocalPads)
    if (crystalReplacement) return crystalReplacement
    const canDimensions =
      bodyDimensions ??
      (normalizedFootprint.startsWith("OSC4_61X65") ? { x: 2.5, y: 2 } : undefined)
    if (canDimensions) {
      return createJscadReplacement(
        createMetalCanCadModel({
          length: canDimensions.x,
          width: canDimensions.y,
          height: getPackageHeightMillimeters(normalizedFootprint),
        }),
      )
    }
  }
  if (/^CAP(?:T|AE)/u.test(normalizedFootprint)) {
    const capacitorDimensions = getKnownTantalumDimensions(normalizedFootprint)
    if (capacitorDimensions) {
      return createJscadReplacement(createTantalumCapacitorCadModel(capacitorDimensions))
    }
  }
  if (normalizedFootprint === "RD205SMD_250D") {
    return createJscadReplacement(createSmdElectrolyticCapacitorCadModel())
  }
  if (/^U_48_RSL/u.test(normalizedFootprint)) {
    return { kind: "footprinter", footprinterString: "qfn48_w6mm_h6mm" }
  }
  return undefined
}
