import type { JscadOperation } from "jscad-planner"
import type { ModelLocalPad } from "./get-model-local-pads"
import { createSmtPadCadContact } from "./create-smt-pad-cad-contact"
import {
  colorize,
  connectorModelColors,
  createColoredCuboid,
  createColoredRoundedCuboid,
  subtract,
  translate,
} from "./jscad-model-primitives"

// Socket-local millimeters: PCB at Z=0, card entry along -Y. The housing is
// simplified; the eight mating springs sit inside it, below the metal lid.
export function createMicroSdConnectorCadModel(modelLocalPads: ModelLocalPad[]): JscadOperation[] {
  const shell = colorize(
    connectorModelColors.metal,
    subtract([
      createColoredRoundedCuboid({
        center: [0, -0.4, 1.055],
        color: connectorModelColors.metal,
        roundRadius: 0.18,
        size: [14.5, 13.5, 1.19],
      }),
      translate([0, -0.7, 0.9], { type: "cuboid", size: [13.1, 13.4, 0.9] }),
    ]),
  )
  return [
    createColoredRoundedCuboid({
      center: [0, 0, 0.31],
      color: connectorModelColors.blackPlastic,
      roundRadius: 0.12,
      size: [14.8, 14.5, 0.3],
    }),
    shell,
    ...Array.from({ length: 8 }, (_, contactIndex) =>
      createColoredCuboid({
        center: [-4.2 + contactIndex * 1.1, 3.8, 0.62],
        color: connectorModelColors.gold,
        size: [0.55, 2.4, 0.12],
      }),
    ),
    ...modelLocalPads.map((pad) => createSmtPadCadContact(pad, connectorModelColors.metal)),
  ]
}
