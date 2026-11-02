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
  const height = packageSize === "40" ? 0.46 : 0.7
  const terminalLength = length * 0.2
  return {
    kind: "jscad",
    jscadOperations: alignTwoTerminalCadModel({
      modelLocalPads,
      jscadOperations: [
        createColoredCuboid({
          center: [0, 0, 0.08],
          size: [length, width, 0.16],
          color: connectorModelColors.whitePlastic,
        }),
        createColoredRoundedCuboid({
          center: [0, 0, (height + 0.16) / 2],
          size: [length * 0.7, width * 0.9, height - 0.16],
          roundRadius: 0.04,
          color: [0.92, 0.94, 0.89],
        }),
        ...[-1, 1].map((side) =>
          createColoredCuboid({
            center: [(side * (length - terminalLength)) / 2, 0, 0.025],
            size: [terminalLength, width, 0.05],
            color: connectorModelColors.metal,
          }),
        ),
      ],
    }),
  }
}
