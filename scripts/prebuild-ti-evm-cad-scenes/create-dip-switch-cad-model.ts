import type { JscadOperation } from "jscad-planner"
import {
  colorize,
  connectorModelColors,
  createColoredCuboid,
  subtract,
  translate,
  union,
} from "./jscad-model-primitives"

// Sitara's TE GDH02 and Würth WS-DISV banks, without removable shipping tape.
// Dimensions and contact positions follow the manufacturer drawing and STEP:
// https://www.we-online.com/components/products/datasheet/416131160804.pdf
// https://www.te.com/en/product-1571983-1.html
// Local +X follows pins 1..N on local -Y; Z=0 is the solder contact plane.
export function createDipSwitchCadModel({ poleCount }: { poleCount: 2 | 4 | 8 }): JscadOperation[] {
  const pitchMillimeters = 1.27
  const bodyLengthMillimeters = poleCount === 2 ? 3.66 : (poleCount - 1) * pitchMillimeters + 2.44
  const bodyWidthMillimeters = poleCount === 2 ? 6.2 : 5.8
  const bodyHeightMillimeters = poleCount === 2 ? 2.3 : 2.65
  const polePositions = Array.from(
    { length: poleCount },
    (_, poleIndex) => (poleIndex - (poleCount - 1) / 2) * pitchMillimeters,
  )
  const housing: JscadOperation = translate([0, 0, (bodyHeightMillimeters + 0.15) / 2], {
    type: "cuboid",
    size: [bodyLengthMillimeters, bodyWidthMillimeters, bodyHeightMillimeters - 0.15],
  })
  const actuatorWindows = polePositions.map((x) =>
    translate([x, -0.35, bodyHeightMillimeters - 0.6], {
      type: "cuboid",
      size: [0.9, 3.6, 1.6],
    }),
  )
  const actuators = polePositions.map((x) =>
    createColoredCuboid({
      center: [x, -0.65, bodyHeightMillimeters - 0.55],
      color: connectorModelColors.whitePlastic,
      size: [0.7, 1.3, 0.9],
    }),
  )
  const contacts = polePositions.flatMap((x) =>
    [-1, 1].map((rowSide) =>
      colorize(
        connectorModelColors.silver,
        union([
          translate([x, rowSide * 3.81, 0.1], {
            type: "cuboid",
            size: [0.45, 0.82, 0.2],
          }),
          translate([x, rowSide * 3.3, 0.6], {
            type: "cuboid",
            size: [0.45, 0.22, 1.2],
          }),
          translate([x, rowSide * 2.95, 1.1], {
            type: "cuboid",
            size: [0.45, 0.92, 0.2],
          }),
        ]),
      ),
    ),
  )

  return [
    colorize(connectorModelColors.blackPlastic, subtract([housing, ...actuatorWindows])),
    ...actuators,
    ...contacts,
  ]
}
