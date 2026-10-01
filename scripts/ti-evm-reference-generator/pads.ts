import { type AltiumComponentRecord, type AltiumPadRecord, getAltiumPcbPadGeometry } from "altiumts"
import type { ReferencePad } from "../../lib/evms/reference-evm-types"
import { nearlyEqual, normalizeRotation, round, toIdentifier } from "./geometry"
import type { ComponentNameByRecordIndex, PinKey, PinKeyByRawPinName, RawPinName } from "./types"

export function createComponentNames(
  componentRecords: AltiumComponentRecord[],
): ComponentNameByRecordIndex {
  const componentNames: ComponentNameByRecordIndex = new Map()
  const usedComponentNames = new Set<string>()
  for (const [componentRecordIndex, componentRecord] of componentRecords.entries()) {
    const baseName =
      toIdentifier(componentRecord.designator ?? `X${componentRecordIndex}`) ||
      `X${componentRecordIndex}`
    const componentName = usedComponentNames.has(baseName)
      ? `${baseName}_${componentRecordIndex}`
      : baseName
    usedComponentNames.add(componentName)
    componentNames.set(componentRecordIndex, componentName)
  }
  return componentNames
}

export function createPinKeys(padRecords: AltiumPadRecord[]): PinKeyByRawPinName {
  const pinKeys: PinKeyByRawPinName = new Map()
  for (const padRecord of padRecords) {
    const rawPinName = getRawPinName(padRecord)
    if (!rawPinName || pinKeys.has(rawPinName)) continue
    pinKeys.set(rawPinName, `pin${pinKeys.size + 1}`)
  }
  return pinKeys
}

export function getRawPinName(padRecord: AltiumPadRecord): RawPinName | undefined {
  const pinName = padRecord.name?.trim()
  if (pinName && pinName !== "0") return pinName
  if (padRecord.netIndex !== undefined && padRecord.netIndex !== 65535) {
    return `pad${padRecord.sourceLocation?.recordIndex ?? "unknown"}`
  }
  return undefined
}

export function getPinKey(params: {
  padRecord: AltiumPadRecord
  pinKeys: PinKeyByRawPinName
}): PinKey | undefined {
  const rawPinName = getRawPinName(params.padRecord)
  return rawPinName ? params.pinKeys.get(rawPinName) : undefined
}

export function createPad(params: {
  padRecord: AltiumPadRecord
  pinKey?: PinKey
  componentCenter: { x: number; y: number }
  componentLayer: "top" | "bottom"
}): ReferencePad {
  const geometry = getAltiumPcbPadGeometry({ record: params.padRecord })
  const padX = geometry.xMils * 0.0254
  const padY = geometry.yMils * 0.0254
  const localX = padX - params.componentCenter.x
  const localY = padY - params.componentCenter.y
  const x = params.componentLayer === "bottom" ? -localX : localX
  const width = geometry.widthMils * 0.0254
  const height = geometry.heightMils * 0.0254
  const holeSize = geometry.holeSizeMils * 0.0254
  const slotLength = geometry.slotLengthMils * 0.0254
  const outputRotation = normalizeRotation(geometry.ccwRotationDegrees)
  const inputRotation =
    params.componentLayer === "bottom" ? normalizeRotation(180 - outputRotation) : outputRotation

  if (params.padRecord.behavior === "through-hole" && !geometry.plated) {
    return {
      kind: "hole",
      x: round(x),
      y: round(localY),
      diameter: round(holeSize),
    }
  }
  if (params.padRecord.behavior === "through-hole") {
    const isCircularPad = geometry.shape === "ROUND" && nearlyEqual(width, height)
    const isCircularHole = geometry.holeShape === "ROUND" && nearlyEqual(holeSize, slotLength)
    if (isCircularPad && isCircularHole) {
      return {
        kind: "plated_hole",
        pinKey: params.pinKey,
        x: round(x),
        y: round(localY),
        shape: "circle",
        holeDiameter: round(holeSize),
        outerDiameter: round(Math.max(width, height)),
      }
    }
    if (geometry.shape === "RECTANGLE" && isCircularHole) {
      return {
        kind: "plated_hole",
        pinKey: params.pinKey,
        x: round(x),
        y: round(localY),
        shape: "circular_hole_with_rect_pad",
        holeDiameter: round(holeSize),
        rectPadWidth: round(width),
        rectPadHeight: round(height),
      }
    }
    return {
      kind: "plated_hole",
      pinKey: params.pinKey,
      x: round(x),
      y: round(localY),
      shape: "oval",
      holeWidth: round(Math.min(holeSize, slotLength)),
      holeHeight: round(Math.max(holeSize, slotLength)),
      outerWidth: round(width),
      outerHeight: round(height),
      pcbRotation: round(inputRotation),
    }
  }
  const isCircle = geometry.shape === "ROUND" && nearlyEqual(width, height)
  const isRounded = geometry.shape === "ROUND" || geometry.shape === "ROUNDEDRECTANGLE"
  const isRotated = !nearlyEqual(inputRotation % 180, 0)
  return {
    kind: "smt",
    pinKey: params.pinKey,
    layer: params.padRecord.layer?.toUpperCase() === "BOTTOM" ? "bottom" : "top",
    x: round(x),
    y: round(localY),
    shape: isCircle
      ? "circle"
      : isRounded
        ? isRotated
          ? "rotated_pill"
          : "pill"
        : isRotated
          ? "rotated_rect"
          : "rect",
    width: isCircle ? undefined : round(width),
    height: isCircle ? undefined : round(height),
    radius: isCircle
      ? round(width / 2)
      : isRounded
        ? round(Math.min(width, height) / 2)
        : undefined,
    ccwRotation: isRotated ? round(inputRotation) : undefined,
  }
}

export function removeRedundantContainedPads(pads: ReferencePad[]): ReferencePad[] {
  return pads.filter((pad, padIndex) => {
    if (pad.kind !== "smt" || pad.pinKey === undefined) return true
    const padBounds = getSmtPadBounds(pad)
    return !pads.some((candidate, candidateIndex) => {
      if (
        candidateIndex === padIndex ||
        candidate.kind !== "smt" ||
        candidate.pinKey !== pad.pinKey ||
        candidate.layer !== pad.layer
      ) {
        return false
      }
      const candidateBounds = getSmtPadBounds(candidate)
      const candidateArea =
        (candidateBounds.maxX - candidateBounds.minX) *
        (candidateBounds.maxY - candidateBounds.minY)
      const padArea = (padBounds.maxX - padBounds.minX) * (padBounds.maxY - padBounds.minY)
      if (candidateArea <= padArea) return false
      return (
        candidateBounds.minX <= padBounds.minX &&
        candidateBounds.maxX >= padBounds.maxX &&
        candidateBounds.minY <= padBounds.minY &&
        candidateBounds.maxY >= padBounds.maxY
      )
    })
  })
}

function getSmtPadBounds(pad: Extract<ReferencePad, { kind: "smt" }>): {
  minX: number
  maxX: number
  minY: number
  maxY: number
} {
  const diameter = (pad.radius ?? 0) * 2
  let width = pad.width ?? diameter
  let height = pad.height ?? diameter
  const rotation = normalizeRotation(pad.ccwRotation ?? 0)
  if (nearlyEqual(rotation % 180, 90)) [width, height] = [height, width]
  return {
    minX: pad.x - width / 2,
    maxX: pad.x + width / 2,
    minY: pad.y - height / 2,
    maxY: pad.y + height / 2,
  }
}
