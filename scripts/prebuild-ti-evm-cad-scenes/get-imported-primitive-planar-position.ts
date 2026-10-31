import { applyToPoint, rotateDEG, scale } from "transformation-matrix"

type Point2 = { x: number; y: number }
type Point3 = Point2 & { z: number }
type CadModelRotation = { x: number; y: number; z: number }
const maximumConversionNoiseMm = 0.01
type PlanarBounds = {
  maximumX: number
  maximumY: number
  minimumX: number
  minimumY: number
  pointCount: number
}

export function getImportedPrimitivePlanarPosition({
  modelJscad,
  modelUnitToMmScaleFactor = 1,
  position,
  rotation = { x: 0, y: 0, z: 0 },
}: {
  modelJscad: unknown
  modelUnitToMmScaleFactor?: number
  position?: Point3
  rotation?: CadModelRotation
}): Point2 | undefined {
  if (!position) return undefined
  if (normalizeDegrees(rotation.x) !== 0 || normalizeDegrees(rotation.y) !== 0) {
    return undefined
  }

  const localCenter = getImportedPrimitiveLocalPlanarCenter(modelJscad)
  if (!localCenter) return undefined
  const scaledLocalCenter = applyToPoint(scale(modelUnitToMmScaleFactor), localCenter)
  const rotatedCenter = applyToPoint(rotateDEG(rotation.z), {
    x: normalizeConversionNoiseMm(scaledLocalCenter.x),
    y: normalizeConversionNoiseMm(scaledLocalCenter.y),
  })

  return {
    x: position.x + rotatedCenter.x,
    y: position.y + rotatedCenter.y,
  }
}

function getImportedPrimitiveLocalPlanarCenter(modelJscad: unknown): Point2 | undefined {
  const bounds: PlanarBounds = {
    maximumX: -Infinity,
    maximumY: -Infinity,
    minimumX: Infinity,
    minimumY: Infinity,
    pointCount: 0,
  }
  updateBoundsFromJscadNode({ bounds, jscadNode: modelJscad })
  if (bounds.pointCount === 0) return undefined

  return {
    x: (bounds.minimumX + bounds.maximumX) / 2,
    y: (bounds.minimumY + bounds.maximumY) / 2,
  }
}

function updateBoundsFromJscadNode({
  bounds,
  jscadNode,
}: {
  bounds: PlanarBounds
  jscadNode: unknown
}): void {
  if (Array.isArray(jscadNode)) {
    for (const childNode of jscadNode) updateBoundsFromJscadNode({ bounds, jscadNode: childNode })
    return
  }
  if (!isObjectRecord(jscadNode)) return

  if (jscadNode.type === "fromPointsGeom2" && Array.isArray(jscadNode.points)) {
    for (const point of jscadNode.points) {
      if (!isPoint2Tuple(point)) continue
      bounds.minimumX = Math.min(bounds.minimumX, point[0])
      bounds.minimumY = Math.min(bounds.minimumY, point[1])
      bounds.maximumX = Math.max(bounds.maximumX, point[0])
      bounds.maximumY = Math.max(bounds.maximumY, point[1])
      bounds.pointCount += 1
    }
    return
  }

  for (const childNode of Object.values(jscadNode)) {
    updateBoundsFromJscadNode({ bounds, jscadNode: childNode })
  }
}

function isObjectRecord(jscadNode: unknown): jscadNode is Record<string, unknown> {
  return typeof jscadNode === "object" && jscadNode !== null && !Array.isArray(jscadNode)
}

function isPoint2Tuple(point: unknown): point is [number, number] {
  return (
    Array.isArray(point) &&
    point.length >= 2 &&
    typeof point[0] === "number" &&
    typeof point[1] === "number"
  )
}

function normalizeDegrees(angleDegrees: number): number {
  return ((angleDegrees % 360) + 360) % 360
}

function normalizeConversionNoiseMm(distanceMm: number): number {
  return Math.abs(distanceMm) < maximumConversionNoiseMm ? 0 : distanceMm
}
