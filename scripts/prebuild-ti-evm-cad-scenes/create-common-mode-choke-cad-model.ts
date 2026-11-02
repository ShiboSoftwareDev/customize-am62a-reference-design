import type { JscadOperation } from "jscad-planner"
import { connectorModelColors, createColoredCuboid } from "./jscad-model-primitives"

// Murata DLW21SZ: 2 x 1.2 mm body, with the source footprint's 1.4 mm
// maximum seated height (manufacturer nominal 1.2 +/- 0.2 mm). Four electrodes
// stay isolated across the two windings; package +Z leaves the seated plane.
export function createCommonModeChokeCadModel(): JscadOperation[] {
  return [
    createColoredCuboid({
      center: [0, 0, 0.75],
      size: [2, 1.2, 1.3],
      color: connectorModelColors.darkPlastic,
    }),
    ...[-1, 1].flatMap((sideX) =>
      [-1, 1].map((sideY) =>
        createColoredCuboid({
          center: [sideX * 0.8, sideY * 0.425, 0.15],
          size: [0.4, 0.35, 0.3],
          color: connectorModelColors.metal,
        }),
      ),
    ),
  ]
}
