import jscad from "@jscad/modeling"
import type { Geom3 } from "@jscad/modeling/src/geometries/types"
import type { Vec3 } from "@jscad/modeling/src/maths/types"

// Intersect mesh triangles with the board's Z=constant plane, then use an XY
// crossing test. This verifies that a lead passes through a hole, independently
// of the model's declared position, origin, or bounding box.
export function isPointInsideMeshSection({ point, mesh }: { point: Vec3; mesh: Geom3 }): boolean {
  let crossings = 0
  for (const { vertices } of jscad.geometries.geom3.toPolygons(mesh)) {
    const intersections: Vec3[] = []
    for (let edge = 0; edge < vertices.length; edge++) {
      const start = vertices[edge]!
      const end = vertices[(edge + 1) % vertices.length]!
      if (start[2] > point[2] === end[2] > point[2]) continue
      const fraction = (point[2] - start[2]) / (end[2] - start[2])
      intersections.push([
        start[0] + fraction * (end[0] - start[0]),
        start[1] + fraction * (end[1] - start[1]),
        point[2],
      ])
    }
    if (intersections.length !== 2) continue
    const [start, end] = intersections
    if (start![1] > point[1] === end![1] > point[1]) continue
    const crossingX =
      start![0] + ((point[1] - start![1]) * (end![0] - start![0])) / (end![1] - start![1])
    if (crossingX > point[0]) crossings++
  }
  return crossings % 2 === 1
}
