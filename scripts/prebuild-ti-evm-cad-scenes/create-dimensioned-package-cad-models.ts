import type { Color, JscadOperation } from "jscad-planner"
import type { ModelLocalPad } from "./get-model-local-pads"
import { createSmtPadCadContact } from "./create-smt-pad-cad-contact"
import {
  connectorModelColors,
  createColoredCuboid,
  createColoredCylinder,
  createColoredRoundedCuboid,
} from "./jscad-model-primitives"

const packageColors = {
  blackEpoxy: [0.025, 0.028, 0.032] as Color,
  darkFerrite: [0.11, 0.12, 0.13] as Color,
  greenSubstrate: [0.025, 0.22, 0.12] as Color,
  switchActuator: [0.14, 0.16, 0.18] as Color,
  tantalumBody: [0.72, 0.48, 0.18] as Color,
}

export function createShieldedInductorCadModel(params: {
  height?: number
  length: number
  width: number
}): JscadOperation[] {
  const height = params.height ?? Math.min(params.length, params.width) * 0.55
  const terminalLength = params.length * 0.16
  return [
    createColoredRoundedCuboid({
      center: [0, 0, height / 2],
      color: packageColors.darkFerrite,
      roundRadius: Math.min(params.width * 0.12, 0.5),
      size: [params.length - 2 * terminalLength, params.width, height],
    }),
    ...[-1, 1].map((side) =>
      createColoredCuboid({
        center: [(side * (params.length - terminalLength)) / 2, 0, height * 0.11],
        color: connectorModelColors.metal,
        size: [terminalLength, params.width * 0.72, height * 0.22],
      }),
    ),
  ]
}

export function createMetalCanCadModel(params: {
  height?: number
  length: number
  width: number
}): JscadOperation[] {
  const packageHeight = params.height ?? 0.24 + Math.min(params.length, params.width) * 0.45
  const substrateHeight = Math.min(0.24, packageHeight * 0.3)
  const lidHeight = packageHeight - substrateHeight
  return [
    createColoredCuboid({
      center: [0, 0, substrateHeight / 2],
      color: packageColors.blackEpoxy,
      size: [params.length, params.width, substrateHeight],
    }),
    createColoredRoundedCuboid({
      center: [0, 0, substrateHeight + lidHeight / 2],
      color: connectorModelColors.silver,
      roundRadius: Math.min(params.width * 0.12, lidHeight / 3, 0.45),
      size: [params.length * 0.9, params.width * 0.88, lidHeight],
    }),
  ]
}

export function createTactileSwitchCadModel(params: {
  height?: number
  length: number
  width: number
}): JscadOperation[] {
  const height = params.height ?? 2.2
  return [
    createColoredRoundedCuboid({
      center: [0, 0, height * 0.34],
      color: connectorModelColors.metal,
      roundRadius: Math.min(params.width * 0.08, 0.35),
      size: [params.length, params.width, height * 0.68],
    }),
    createColoredRoundedCuboid({
      center: [0, 0, height * 0.79],
      color: packageColors.switchActuator,
      roundRadius: Math.min(params.width * 0.09, 0.35),
      size: [params.length * 0.48, params.width * 0.52, height * 0.42],
    }),
  ]
}

export function createTantalumCapacitorCadModel(params: {
  height: number
  length: number
  width: number
}): JscadOperation[] {
  const terminalLength = params.length * 0.16
  return [
    createColoredRoundedCuboid({
      center: [0, 0, params.height / 2],
      color: packageColors.tantalumBody,
      roundRadius: Math.min(params.width * 0.08, 0.3),
      size: [params.length - terminalLength * 1.5, params.width, params.height],
    }),
    ...[-1, 1].map((side) =>
      createColoredCuboid({
        center: [(side * (params.length - terminalLength)) / 2, 0, params.height * 0.12],
        color: connectorModelColors.metal,
        size: [terminalLength, params.width, params.height * 0.24],
      }),
    ),
    createColoredCuboid({
      center: [params.length * 0.24, 0, params.height + 0.02],
      color: connectorModelColors.whitePlastic,
      size: [params.length * 0.08, params.width * 0.92, 0.04],
    }),
  ]
}

export function createWifiModuleCadModel(modelLocalPads: ModelLocalPad[]): JscadOperation[] {
  return [
    createColoredRoundedCuboid({
      center: [0, 0, 0.5],
      color: packageColors.greenSubstrate,
      roundRadius: 0.25,
      size: [13.3, 13.4, 0.7],
    }),
    createColoredRoundedCuboid({
      center: [0, 0, 1.425],
      color: connectorModelColors.silver,
      roundRadius: 0.28,
      size: [10.8, 10.4, 1.15],
    }),
    ...modelLocalPads.map((pad) => createSmtPadCadContact(pad, connectorModelColors.gold)),
  ]
}

export function createRadialCapacitorCadModel(params: {
  height: number
  radius: number
}): JscadOperation[] {
  return [
    createColoredCylinder({
      center: [0, 0, params.height / 2],
      color: [0.08, 0.09, 0.1],
      height: params.height,
      radius: params.radius,
    }),
    createColoredCylinder({
      center: [0, 0, params.height + 0.04],
      color: connectorModelColors.silver,
      height: 0.08,
      radius: params.radius * 0.9,
    }),
  ]
}
