export type CadModelSize = {
  x: number
  y: number
  z: number
}

type JscadOperation = {
  options?: unknown
  points?: unknown
  shape?: unknown
  type?: unknown
}

export function getPrimitiveCadModelSize(modelJscad: unknown): CadModelSize | undefined {
  const colorizedOperation = asJscadOperation(modelJscad)
  if (colorizedOperation?.type !== "colorize") return undefined

  const extrusionOperation = asJscadOperation(colorizedOperation.shape)
  if (extrusionOperation?.type !== "extrudeLinear") return undefined

  const height = getExtrusionHeight(extrusionOperation.options)
  const pointsOperation = asJscadOperation(extrusionOperation.shape)
  if (height === undefined || pointsOperation?.type !== "fromPointsGeom2") return undefined

  const points = getPoints(pointsOperation)
  if (!points?.length) return undefined

  const xCoordinates = points.map(([x]) => x)
  const yCoordinates = points.map(([, y]) => y)
  return {
    x: Math.max(...xCoordinates) - Math.min(...xCoordinates),
    y: Math.max(...yCoordinates) - Math.min(...yCoordinates),
    z: Math.abs(height),
  }
}

function asJscadOperation(value: unknown): JscadOperation | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined
  return {
    options: Reflect.get(value, "options"),
    points: Reflect.get(value, "points"),
    shape: Reflect.get(value, "shape"),
    type: Reflect.get(value, "type"),
  }
}

function getExtrusionHeight(options: unknown): number | undefined {
  if (typeof options !== "object" || options === null || Array.isArray(options)) return undefined
  const height = Reflect.get(options, "height")
  return typeof height === "number" && Number.isFinite(height) ? height : undefined
}

function getPoints(operation: JscadOperation): [number, number][] | undefined {
  const points = operation.points
  if (!Array.isArray(points)) return undefined

  const validPoints = points.filter(
    (point): point is [number, number] =>
      Array.isArray(point) &&
      point.length === 2 &&
      point.every((coordinate) => typeof coordinate === "number" && Number.isFinite(coordinate)),
  )
  return validPoints.length === points.length ? validPoints : undefined
}
