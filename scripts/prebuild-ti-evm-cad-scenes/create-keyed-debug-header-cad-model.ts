import type { JscadOperation } from "jscad-planner"
import {
  connectorModelColors,
  colorize,
  createColoredRoundedCuboid,
  translate,
  union,
} from "./jscad-model-primitives"

// Samtec FTR-110-51-D-06: 1.27 mm column pitch, 2.54 mm row spacing,
// 0.46 mm square contacts, 4.83 mm posts, and position 6 omitted.
// Local +X follows increasing TI pin numbers; odd pins occupy local -Y.
// https://suddendocs.samtec.com/prints/ftr-1xx-xx-xx-d-xx-x-xx-mkt.pdf
export function createKeyedDebugHeaderCadModel(): JscadOperation[] {
  const bodyBottomZ = 1.3
  const bodyTopZ = bodyBottomZ + 2.54
  const postTopZ = bodyTopZ + 4.83
  const pinWidth = 0.46
  const rowOffset = 2.54 / 2
  const tailLength = 7.518 / 2 - rowOffset
  const contacts = Array.from({ length: 20 }, (_, contactIndex) => {
    const pinNumber = contactIndex + 1
    if (pinNumber === 6) return []
    const x = (Math.floor(contactIndex / 2) - 4.5) * 1.27
    const rowSide = pinNumber % 2 === 1 ? -1 : 1
    const post = translate([x, rowSide * rowOffset, postTopZ / 2], {
      type: "cuboid",
      size: [pinWidth, pinWidth, postTopZ],
    })
    const solderTail = translate([x, rowSide * (rowOffset + tailLength / 2), pinWidth / 2], {
      type: "cuboid",
      size: [pinWidth, tailLength, pinWidth],
    })
    return [colorize(connectorModelColors.gold, union([post, solderTail]))]
  }).flat()

  return [
    createColoredRoundedCuboid({
      center: [0, 0, (bodyTopZ + bodyBottomZ) / 2],
      color: connectorModelColors.blackPlastic,
      roundRadius: 0.1,
      size: [10 * 1.27, 4.98, bodyTopZ - bodyBottomZ],
    }),
    ...contacts,
  ]
}
