import jscad from "@jscad/modeling"
import type { Geom3, Geometry } from "@jscad/modeling/src/geometries/types"
import {
  executeJscadOperations,
  type JscadImplementation,
  type JscadOperation,
} from "jscad-planner"

// The planner accepts number[] vectors; native JSCAD requires fixed tuples.
const nativeJscad = {
  ...jscad,
  geometries: {
    ...jscad.geometries,
    geom2: {
      ...jscad.geometries.geom2,
      create: jscad.geometries.geom2.fromPoints,
    },
    path2: {
      ...jscad.geometries.path2,
      create: (points: [number, number][]) => jscad.geometries.path2.fromPoints({}, points),
    },
  },
  transforms: {
    ...jscad.transforms,
    rotate: ([x = 0, y = 0, z = 0]: number[], geometry: Geometry) =>
      jscad.transforms.rotate([x, y, z], geometry),
    scale: ([x = 1, y = 1, z = 1]: number[], geometry: Geometry) =>
      jscad.transforms.scale([x, y, z], geometry),
    translate: ([x = 0, y = 0, z = 0]: number[], geometry: Geometry) =>
      jscad.transforms.translate([x, y, z], geometry),
  },
} as JscadImplementation<Geometry>

export function executeCadModelOperation(operation: JscadOperation): Geom3 {
  const geometry = executeJscadOperations(nativeJscad, operation)
  if (!jscad.geometries.geom3.isA(geometry)) throw new Error("Expected solid CAD geometry")
  return geometry
}
