import type { Color, JscadOperation, Vector2D, Vector3D } from "jscad-planner"

export const connectorModelColors = {
  amberLed: [0.92, 0.42, 0.04] as Color,
  blackPlastic: [0.035, 0.04, 0.05] as Color,
  darkPlastic: [0.08, 0.09, 0.1] as Color,
  gold: [0.83, 0.58, 0.12] as Color,
  greenLed: [0.08, 0.7, 0.2] as Color,
  metal: [0.58, 0.62, 0.66] as Color,
  silver: [0.74, 0.77, 0.8] as Color,
  whitePlastic: [0.78, 0.8, 0.76] as Color,
}

export function createColoredCuboid(params: {
  center: Vector3D
  color: Color
  size: Vector3D
}): JscadOperation {
  return colorize(
    params.color,
    translate(params.center, {
      type: "cuboid",
      size: params.size,
    }),
  )
}

export function createColoredRoundedCuboid(params: {
  center: Vector3D
  color: Color
  roundRadius: number
  size: Vector3D
}): JscadOperation {
  return colorize(
    params.color,
    translate(params.center, {
      type: "roundedCuboid",
      roundRadius: params.roundRadius,
      segments: 24,
      size: params.size,
    }),
  )
}

export function createColoredCylinder(params: {
  center: Vector3D
  color: Color
  height: number
  radius: number
  rotation?: Vector3D
}): JscadOperation {
  const cylinder: JscadOperation = {
    type: "cylinder",
    height: params.height,
    radius: params.radius,
    resolution: 32,
  }
  const rotatedCylinder = params.rotation
    ? { type: "rotate" as const, angles: params.rotation, shape: cylinder }
    : cylinder
  return colorize(params.color, translate(params.center, rotatedCylinder))
}

export function createColoredPrism(params: {
  center: Vector3D
  color: Color
  height: number
  radius: number
  sideCount: number
}): JscadOperation {
  const points = Array.from({ length: params.sideCount }, (_, pointIndex) => {
    const angle = (pointIndex * 2 * Math.PI) / params.sideCount
    return [Math.cos(angle) * params.radius, Math.sin(angle) * params.radius] as Vector2D
  })
  const prismBasePosition: Vector3D = [
    params.center[0],
    params.center[1],
    params.center[2] - params.height / 2,
  ]
  return colorize(
    params.color,
    translate(prismBasePosition, {
      type: "extrudeLinear",
      options: { height: params.height },
      shape: { type: "fromPointsGeom2", points },
    }),
  )
}

export function colorize(color: Color, shape: JscadOperation): JscadOperation {
  return { type: "colorize", color, shape }
}

export function translate(vector: Vector3D, shape: JscadOperation): JscadOperation {
  return { type: "translate", vector, shape }
}

export function union(shapes: JscadOperation[]): JscadOperation {
  return { type: "union", shapes }
}

export function subtract(shapes: JscadOperation[]): JscadOperation {
  return { type: "subtract", shapes }
}
