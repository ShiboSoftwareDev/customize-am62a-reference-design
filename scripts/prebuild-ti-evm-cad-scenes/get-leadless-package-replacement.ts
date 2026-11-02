import { applyToPoint, rotateDEG } from "transformation-matrix"
import type { CadModelReplacement } from "./get-cad-model-replacement"
import type { ModelLocalPad } from "./get-model-local-pads"
import type { JscadOperation } from "jscad-planner"
import { getPackageBodyDimensionsMillimeters } from "./get-package-body-dimensions"
import { getPackageHeightMillimeters } from "./get-package-height-millimeters"
import { connectorModelColors, createColoredCuboid } from "./jscad-model-primitives"

// Package-local XY follows the imported lands. Z=0 is the seated plane;
// underside metal is clipped to the case, rather than copying PCB land lengths.
export function getLeadlessPackageReplacement(
  normalizedFootprint: string,
  modelLocalPads: ModelLocalPad[],
): CadModelReplacement | undefined {
  if (
    !/^(?:U?QFN|VQFN(?:HR)?|WQFN|X[12]SON|U?SON|UDFN|WSON|VSON(?:HR)?)\d+/u.test(
      normalizedFootprint,
    )
  )
    return undefined
  const dimensions = getPackageBodyDimensionsMillimeters(normalizedFootprint)
  const height = getPackageHeightMillimeters(normalizedFootprint)
  if (!dimensions || !height || !modelLocalPads.length)
    return getUndimensionedLeadlessReplacement(normalizedFootprint)
  const terminalThickness = Math.min(0.05, height / 5)
  return {
    kind: "jscad",
    jscadOperations: [
      createColoredCuboid({
        center: [0, 0, (height + terminalThickness) / 2],
        size: [dimensions.x, dimensions.y, height - terminalThickness],
        color: connectorModelColors.blackPlastic,
      }),
      ...modelLocalPads.map((pad) => createLeadlessContact({ pad, dimensions, terminalThickness })),
    ],
  }
}

function createLeadlessContact({
  pad,
  dimensions,
  terminalThickness,
}: {
  pad: ModelLocalPad
  dimensions: { x: number; y: number }
  terminalThickness: number
}): JscadOperation {
  // Custom Altium lands may become microscopic connection anchors. Use their
  // locations, not their fictitious widths, for simplified underside terminals.
  const contactWidth = pad.isConnectionAnchor ? 0.15 : pad.width * 0.75
  const contactHeight = pad.isConnectionAnchor ? 0.15 : pad.height * 0.75
  const isQuarterTurn =
    Math.abs(applyToPoint(rotateDEG(pad.ccwRotationDegrees), { x: 1, y: 0 }).y) > 0.5
  const width = isQuarterTurn ? contactHeight : contactWidth
  const length = isQuarterTurn ? contactWidth : contactHeight
  const minimumX = Math.max(-dimensions.x / 2, pad.x - width / 2)
  const maximumX = Math.min(dimensions.x / 2, pad.x + width / 2)
  const minimumY = Math.max(-dimensions.y / 2, pad.y - length / 2)
  const maximumY = Math.min(dimensions.y / 2, pad.y + length / 2)
  if (maximumX <= minimumX || maximumY <= minimumY)
    throw new Error("Leadless terminal lies outside its package envelope")
  return createColoredCuboid({
    center: [(minimumX + maximumX) / 2, (minimumY + maximumY) / 2, terminalThickness / 2],
    size: [maximumX - minimumX, maximumY - minimumY, terminalThickness],
    color: connectorModelColors.metal,
  })
}

// Keep the established library model when the source lacks a seated envelope.
function getUndimensionedLeadlessReplacement(
  normalizedFootprint: string,
): CadModelReplacement | undefined {
  const dimensions = getPackageBodyDimensionsMillimeters(normalizedFootprint)
  const qfnPinCount = /^(?:U?QFN|VQFN(?:HR)?|WQFN)(\d+)/u.exec(normalizedFootprint)?.[1]
  if (qfnPinCount) {
    const dimensionsToken = dimensions ? `_w${dimensions.x}mm_h${dimensions.y}mm` : ""
    return { kind: "footprinter", footprinterString: `qfn${qfnPinCount}${dimensionsToken}` }
  }
  const sonPinCount = /^(?:X[12]SON|U?SON|UDFN|WSON|VSON(?:HR)?)(\d+)/u.exec(
    normalizedFootprint,
  )?.[1]
  if (!sonPinCount) return undefined
  const dimensionsToken = dimensions
    ? `_w${dimensions.x}mm_h${dimensions.y}mm_bodywidth${dimensions.x}mm_bodylength${dimensions.y}mm`
    : ""
  const pinPitchMillimeters = Number(sonPinCount) <= 5 ? 0.4 : 0.5
  return {
    kind: "footprinter",
    footprinterString: `dfn${sonPinCount}${dimensionsToken}_p${pinPitchMillimeters}mm`,
  }
}
