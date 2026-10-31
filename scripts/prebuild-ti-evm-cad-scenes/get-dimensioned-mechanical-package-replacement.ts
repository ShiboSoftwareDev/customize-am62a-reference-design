import type { CadModelComponentIdentity, CadModelReplacement } from "./get-cad-model-replacement"
import {
  createMetalCanCadModel,
  createRadialCapacitorCadModel,
  createShieldedInductorCadModel,
  createTantalumCapacitorCadModel,
  createWifiModuleCadModel,
} from "./create-dimensioned-package-cad-models"
import { getPackageBodyDimensionsMillimeters } from "./get-package-body-dimensions"

function createJscadReplacement(
  jscadOperations: Extract<CadModelReplacement, { kind: "jscad" }>["jscadOperations"],
): CadModelReplacement {
  return { kind: "jscad", jscadOperations }
}

function getMetricInductorDimensions(
  normalizedFootprint: string,
): { x: number; y: number } | undefined {
  const metricSize = /^L(\d{2})(\d{2})$/u.exec(normalizedFootprint)
  if (metricSize) return { x: Number(metricSize[1]) / 10, y: Number(metricSize[2]) / 10 }
  if (/^IND0806/u.test(normalizedFootprint)) return { x: 2, y: 1.6 }
  if (/^L4P_2D54/u.test(normalizedFootprint)) return { x: 9.2, y: 6 }
  if (/^2520$/u.test(normalizedFootprint)) return { x: 2.5, y: 2 }
  return undefined
}

function getInductorHeight(normalizedFootprint: string): number | undefined {
  if (/^L4P_2D54/u.test(normalizedFootprint)) return 5
  return undefined
}

function getKnownMetalCanDimensions(
  normalizedFootprint: string,
): { x: number; y: number } | undefined {
  if (/^XTAL150SMD_125X196/u.test(normalizedFootprint)) return { x: 4.98, y: 3.18 }
  if (/^XTAL4_126-216SMD/u.test(normalizedFootprint)) return { x: 5.49, y: 3.2 }
  if (/^OSC4_61X65/u.test(normalizedFootprint)) return { x: 2.5, y: 2 }
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
): CadModelReplacement | undefined {
  const normalizedFootprint = componentIdentity.altiumFootprint.trim().toUpperCase()
  const bodyDimensions = getPackageBodyDimensionsMillimeters(normalizedFootprint)

  if (/^MOD100_WL18/u.test(normalizedFootprint)) {
    return createJscadReplacement(createWifiModuleCadModel())
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
    const canDimensions = bodyDimensions ?? getKnownMetalCanDimensions(normalizedFootprint)
    if (canDimensions) {
      return createJscadReplacement(
        createMetalCanCadModel({
          length: canDimensions.x,
          width: canDimensions.y,
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
  if (/^RD205/u.test(normalizedFootprint)) {
    return createJscadReplacement(createRadialCapacitorCadModel({ height: 5.2, radius: 2.5 }))
  }
  if (/^U_48_RSL/u.test(normalizedFootprint)) {
    return { kind: "footprinter", footprinterString: "qfn48_w6mm_h6mm" }
  }
  return undefined
}
