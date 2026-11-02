import type { JscadOperation } from "jscad-planner"
import type { ModelLocalPad } from "./get-model-local-pads"
import { createSmtPadCadContact } from "./create-smt-pad-cad-contact"
import {
  connectorModelColors,
  createColoredCuboid,
  createColoredRoundedCuboid,
} from "./jscad-model-primitives"

// BeaglePlay's TS23M body is 4.55 x 2.3 mm, 1.85 mm high. Its actuator
// projects toward package +Y; Z=0 is the mounting plane. Pads use this frame.
export function createSideActuatedSwitchCadModel(
  modelLocalPads: ModelLocalPad[],
): JscadOperation[] {
  return [
    createColoredCuboid({
      center: [0, 0, 0.25],
      color: connectorModelColors.blackPlastic,
      size: [4.55, 2.3, 0.3],
    }),
    createColoredRoundedCuboid({
      center: [0, 0, 1.125],
      color: connectorModelColors.metal,
      roundRadius: 0.1,
      size: [4.55, 2.3, 1.45],
    }),
    createColoredRoundedCuboid({
      center: [0, 1.55, 1],
      color: connectorModelColors.blackPlastic,
      roundRadius: 0.1,
      size: [2.2, 1.6, 0.9],
    }),
    ...modelLocalPads.map((pad) => createSmtPadCadContact(pad, connectorModelColors.silver)),
    ...modelLocalPads
      .filter((pad) => pad.y < -1.15)
      .map((pad) =>
        createColoredCuboid({
          center: [pad.x, (pad.y - 0.9) / 2, 0.075],
          color: connectorModelColors.silver,
          size: [0.4, -0.9 - pad.y, 0.15],
        }),
      ),
  ]
}
