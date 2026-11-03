import type { JscadOperation } from "jscad-planner"
import type { ModelLocalPad } from "./get-model-local-pads"
import { createSmtPadCadContact } from "./create-smt-pad-cad-contact"
import {
  colorize,
  connectorModelColors,
  createColoredCylinder,
  createColoredRoundedCuboid,
  subtract,
  translate,
} from "./jscad-model-primitives"

// Bourns 3214W top-adjust drawing. Local XY follows the three SMT lands,
// with pins 1 and 3 on -X and the seating plane at Z=0.
export function createBourns3214wCadModel(pads: ModelLocalPad[]): JscadOperation[] {
  const caseHeight = 5.1
  const screwX = 0.85
  const screwY = -1.2
  const screwCenter: [number, number, number] = [screwX, screwY, caseHeight - 0.35]
  const caseColor: [number, number, number] = [0.72, 0.65, 0.49]
  const housing = colorize(
    caseColor,
    subtract([
      createColoredRoundedCuboid({
        center: [0, 0, caseHeight / 2],
        color: caseColor,
        roundRadius: 0.12,
        size: [3.5, 4.8, caseHeight],
      }),
      createColoredCylinder({
        center: screwCenter,
        color: caseColor,
        height: 0.9,
        radius: 0.81,
      }),
    ]),
  )
  const screw = colorize(
    connectorModelColors.silver,
    subtract([
      createColoredCylinder({
        center: screwCenter,
        color: connectorModelColors.silver,
        height: 0.66,
        radius: 0.75,
      }),
      translate([screwX, screwY, caseHeight - 0.17], {
        type: "cuboid",
        size: [1.6, 0.56, 0.6],
      }),
    ]),
  )
  return [
    housing,
    screw,
    ...pads.map((pad) => createSmtPadCadContact(pad, connectorModelColors.metal)),
  ]
}
