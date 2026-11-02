import jscad from "@jscad/modeling"
import type { Geom3 } from "@jscad/modeling/src/geometries/types"
import type { Vec3 } from "@jscad/modeling/src/maths/types"

type ContactVertexKey = string

// Join touching coplanar triangles into individual solder-contact patches.
export function getMeshContactCenters({
  mesh,
  surfaceZ,
}: {
  mesh: Geom3
  surfaceZ: number
}): Array<{ x: number; y: number }> {
  const faces = jscad.geometries.geom3
    .toPolygons(mesh)
    .filter(({ vertices }) => vertices.every((point) => Math.abs(point[2] - surfaceZ) < 0.00001))
  const faceIndicesByVertex = new Map<ContactVertexKey, number[]>()
  for (const [index, face] of faces.entries()) {
    for (const vertex of face.vertices) {
      const key = getVertexKey(vertex)
      const indices = faceIndicesByVertex.get(key) ?? []
      indices.push(index)
      faceIndicesByVertex.set(key, indices)
    }
  }
  const visited = new Set<number>()
  const centers: Array<{ x: number; y: number }> = []
  for (let index = 0; index < faces.length; index++) {
    if (visited.has(index)) continue
    const pending = new Set([index])
    const xs: number[] = []
    const ys: number[] = []
    for (const current of pending) {
      if (visited.has(current)) continue
      visited.add(current)
      for (const vertex of faces[current]!.vertices) {
        xs.push(vertex[0])
        ys.push(vertex[1])
        for (const neighbor of faceIndicesByVertex.get(getVertexKey(vertex)) ?? []) {
          if (!visited.has(neighbor)) pending.add(neighbor)
        }
      }
    }
    centers.push({
      x: (Math.min(...xs) + Math.max(...xs)) / 2,
      y: (Math.min(...ys) + Math.max(...ys)) / 2,
    })
  }
  return centers
}

function getVertexKey(vertex: Vec3): ContactVertexKey {
  return `${vertex[0].toFixed(5)},${vertex[1].toFixed(5)}`
}
