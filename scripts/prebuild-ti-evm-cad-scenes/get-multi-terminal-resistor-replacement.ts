import { applyToPoint, rotateDEG } from "transformation-matrix"
import type { CadModelReplacement } from "./get-cad-model-replacement"
import type { ModelLocalPad } from "./get-model-local-pads"
import {
  colorize,
  connectorModelColors,
  createColoredCuboid,
  subtract,
} from "./jscad-model-primitives"

export function getMultiTerminalResistorReplacement({
  normalizedFootprint,
  modelLocalPads,
}: {
  normalizedFootprint: string
  modelLocalPads: ModelLocalPad[]
}): CadModelReplacement | undefined {
  const isArray = /^RESA_EXB_0201-4_/u.test(normalizedFootprint)
  const isKelvin = /^RES(?:_KRL3216T4_1206-4|1206-4TERM|_FC4T_1206-4)/u.test(normalizedFootprint)
  if (!isArray && !isKelvin) return undefined
  if (modelLocalPads.length !== (isArray ? 8 : 4)) return undefined

  // Panasonic EXB-18V is a 1.6 x 0.8 mm array. The four-terminal
  // current-sense packages are 3.2 x 1.6 mm, with isolated Kelvin contacts.
  const bodyLength = isArray ? 1.6 : 3.2
  const bodyWidth = isArray ? 0.8 : 1.6
  const bodyHeight = isArray ? 0.45 : 0.7
  const padCorners = modelLocalPads.flatMap(getPadCorners)
  const padSpanX =
    Math.max(...padCorners.map((point) => point.x)) -
    Math.min(...padCorners.map((point) => point.x))
  const padSpanY =
    Math.max(...padCorners.map((point) => point.y)) -
    Math.min(...padCorners.map((point) => point.y))
  const width = padSpanX >= padSpanY ? bodyLength : bodyWidth
  const length = padSpanX >= padSpanY ? bodyWidth : bodyLength
  const terminals = modelLocalPads.map((pad) => {
    const corners = getPadCorners(pad)
    const minX = Math.max(-width / 2, Math.min(...corners.map((point) => point.x)))
    const maxX = Math.min(width / 2, Math.max(...corners.map((point) => point.x)))
    const minY = Math.max(-length / 2, Math.min(...corners.map((point) => point.y)))
    const maxY = Math.min(length / 2, Math.max(...corners.map((point) => point.y)))
    return createColoredCuboid({
      center: [(minX + maxX) / 2, (minY + maxY) / 2, bodyHeight / 2],
      color: connectorModelColors.silver,
      size: [maxX - minX, maxY - minY, bodyHeight + 0.02],
    })
  })
  const body = createColoredCuboid({
    center: [0, 0, bodyHeight / 2],
    color: [0.08, 0.075, 0.07],
    size: [width, length, bodyHeight],
  })
  return {
    kind: "jscad",
    // Separate body and terminal volumes avoid coplanar faces while orbiting.
    jscadOperations: [colorize([0.08, 0.075, 0.07], subtract([body, ...terminals])), ...terminals],
  }
}

function getPadCorners(pad: ModelLocalPad): Array<{ x: number; y: number }> {
  const padToModelTransform = rotateDEG(pad.ccwRotationDegrees)
  return [-1, 1].flatMap((sideX) =>
    [-1, 1].map((sideY) => {
      const offset = applyToPoint(padToModelTransform, {
        x: (sideX * pad.width) / 2,
        y: (sideY * pad.height) / 2,
      })
      return { x: pad.x + offset.x, y: pad.y + offset.y }
    }),
  )
}
