import type { CadModelComponentIdentity, CadModelReplacement } from "./get-cad-model-replacement"
import type { ModelLocalPad } from "./get-model-local-pads"
import { alignTwoTerminalCadModel } from "./align-two-terminal-cad-model"
import {
  connectorModelColors,
  createColoredCuboid,
  createColoredRoundedCuboid,
} from "./jscad-model-primitives"

export function getIndicatorLedReplacement(
  { altiumFootprint }: CadModelComponentIdentity,
  modelLocalPads: ModelLocalPad[],
): CadModelReplacement | undefined {
  // Würth WL-SMCC 150040 and 150080 are LEDs, even with TI's LD designators.
  const packageSize = /^LED_1500(40|80)/u.exec(altiumFootprint.toUpperCase())?.[1]
  if (!packageSize) return undefined
  const length = packageSize === "40" ? 1 : 2
  const width = packageSize === "40" ? 0.5 : 1.25
  const height = packageSize === "40" ? 0.25 : 0.7
  const substrateTop = packageSize === "40" ? 0.11 : 0.3
  const terminalThickness = 0.03
  const terminalLength = length * 0.2
  return {
    kind: "jscad",
    jscadOperations: alignTwoTerminalCadModel({
      modelLocalPads,
      jscadOperations: [
        createColoredCuboid({
          center: [0, 0, (substrateTop + terminalThickness) / 2],
          size: [length, width, substrateTop - terminalThickness],
          color: connectorModelColors.whitePlastic,
        }),
        createColoredRoundedCuboid({
          center: [0, 0, (height + substrateTop) / 2],
          size: [
            packageSize === "40" ? length : 1.4,
            packageSize === "40" ? width : 1.2,
            height - substrateTop,
          ],
          roundRadius: packageSize === "40" ? 0.01 : 0.04,
          color: [0.92, 0.94, 0.89],
        }),
        ...[-1, 1].map((side) =>
          createColoredCuboid({
            center: [(side * (length - terminalLength)) / 2, 0, terminalThickness / 2],
            size: [terminalLength, width, terminalThickness],
            color: connectorModelColors.metal,
          }),
        ),
      ],
    }),
  }
}
