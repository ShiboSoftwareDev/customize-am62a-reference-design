import type { Color, JscadOperation } from "jscad-planner"
import { createColoredCuboid } from "./jscad-model-primitives"

export type TwoTerminalPackageKind = "capacitor" | "diode" | "inductor" | "led" | "resistor"

type ImperialPackageSize =
  | "01005"
  | "0201"
  | "0402"
  | "0603"
  | "0805"
  | "1206"
  | "1210"
  | "2010"
  | "2512"

type PackageDimensions = {
  height: number
  length: number
  width: number
}

const packageDimensionsByImperialSize: Record<ImperialPackageSize, PackageDimensions> = {
  "01005": { length: 0.4, width: 0.2, height: 0.15 },
  "0201": { length: 0.6, width: 0.3, height: 0.23 },
  "0402": { length: 1, width: 0.5, height: 0.35 },
  "0603": { length: 1.6, width: 0.8, height: 0.5 },
  "0805": { length: 2, width: 1.25, height: 0.65 },
  "1206": { length: 3.2, width: 1.6, height: 0.8 },
  "1210": { length: 3.2, width: 2.5, height: 1.1 },
  "2010": { length: 5, width: 2.5, height: 1.1 },
  "2512": { length: 6.3, width: 3.2, height: 1.2 },
}

const twoTerminalColors = {
  capacitorCeramic: [0.78, 0.64, 0.42] as Color,
  diodeBody: [0.025, 0.028, 0.032] as Color,
  diodeMark: [0.8, 0.82, 0.84] as Color,
  inductorBody: [0.12, 0.13, 0.14] as Color,
  ledBody: [0.82, 0.84, 0.82] as Color,
  ledLens: [0.12, 0.72, 0.32] as Color,
  resistorBody: [0.15, 0.13, 0.1] as Color,
  terminal: [0.68, 0.7, 0.72] as Color,
}

export function createTwoTerminalCadModel(params: {
  kind: TwoTerminalPackageKind
  packageSize: ImperialPackageSize
}): JscadOperation[] {
  const dimensions = packageDimensionsByImperialSize[params.packageSize]
  const terminalLength = dimensions.length * 0.2
  const bodyLength = dimensions.length - terminalLength * 2
  const bodyColor = getBodyColor(params.kind)
  const terminalOffset = (dimensions.length - terminalLength) / 2
  const operations = [
    createColoredCuboid({
      center: [0, 0, dimensions.height / 2],
      color: bodyColor,
      size: [bodyLength, dimensions.width * 0.94, dimensions.height * 0.9],
    }),
    createColoredCuboid({
      center: [-terminalOffset, 0, dimensions.height / 2],
      color: twoTerminalColors.terminal,
      size: [terminalLength, dimensions.width, dimensions.height],
    }),
    createColoredCuboid({
      center: [terminalOffset, 0, dimensions.height / 2],
      color: twoTerminalColors.terminal,
      size: [terminalLength, dimensions.width, dimensions.height],
    }),
  ]

  if (params.kind === "diode") {
    operations.push(
      createColoredCuboid({
        center: [bodyLength * 0.28, 0, dimensions.height * 0.96],
        color: twoTerminalColors.diodeMark,
        size: [Math.max(dimensions.length * 0.08, 0.04), dimensions.width * 0.96, 0.03],
      }),
    )
  }
  if (params.kind === "led") {
    operations.push(
      createColoredCuboid({
        center: [0, 0, dimensions.height * 0.96],
        color: twoTerminalColors.ledLens,
        size: [bodyLength * 0.58, dimensions.width * 0.58, 0.04],
      }),
    )
  }
  return operations
}

function getBodyColor(kind: TwoTerminalPackageKind): Color {
  switch (kind) {
    case "capacitor":
      return twoTerminalColors.capacitorCeramic
    case "diode":
      return twoTerminalColors.diodeBody
    case "inductor":
      return twoTerminalColors.inductorBody
    case "led":
      return twoTerminalColors.ledBody
    case "resistor":
      return twoTerminalColors.resistorBody
  }
}
