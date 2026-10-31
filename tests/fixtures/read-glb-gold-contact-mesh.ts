import jscad from "@jscad/modeling"
import type { Vec3 } from "@jscad/modeling/src/maths/types"

type GlbDocument = {
  accessors: Array<{
    bufferView: number
    byteOffset?: number
    componentType: number
    count: number
  }>
  bufferViews: Array<{ byteOffset?: number; byteStride?: number }>
  materials: Array<{ pbrMetallicRoughness?: { baseColorFactor?: number[] } }>
  meshes: Array<{
    primitives: Array<{
      attributes: { POSITION: number }
      indices: number
      material: number
    }>
  }>
  nodes: Array<{
    extras?: { tscircuit?: { componentName?: string } }
    matrix?: number[]
    mesh?: number
    rotation?: number[]
    scale?: number[]
    translation?: Vec3
  }>
}

export function readGlbGoldContactMesh({
  componentName,
  glb,
}: {
  componentName: string
  glb: ArrayBuffer
}) {
  const jsonChunkLength = new DataView(glb).getUint32(12, true)
  const document = JSON.parse(
    new TextDecoder().decode(new Uint8Array(glb, 20, jsonChunkLength)),
  ) as GlbDocument
  const binaryOffset = 28 + jsonChunkLength
  const node = document.nodes.find(
    (candidate) => candidate.extras?.tscircuit?.componentName === componentName,
  )
  if (!node || node.mesh === undefined) throw new Error(`Missing ${componentName} mesh`)
  if (node.matrix || node.rotation || node.scale) {
    throw new Error("Expected the exporter to bake model rotation and scale into its vertices")
  }
  const translation = node.translation ?? [0, 0, 0]
  const triangles: Vec3[][] = []
  for (const primitive of document.meshes[node.mesh]!.primitives) {
    const color = document.materials[primitive.material]?.pbrMetallicRoughness?.baseColorFactor
    if (!color || color[0]! < 0.5 || color[1]! < 0.3 || color[2]! > 0.3) continue
    const positionAccessor = document.accessors[primitive.attributes.POSITION]!
    const positionBufferView = document.bufferViews[positionAccessor.bufferView]!
    if (positionAccessor.componentType !== 5126 || positionBufferView.byteStride) {
      throw new Error("Expected packed float32 mesh positions")
    }
    const positions = new Float32Array(
      glb,
      binaryOffset + (positionBufferView.byteOffset ?? 0) + (positionAccessor.byteOffset ?? 0),
      positionAccessor.count * 3,
    )
    const indexAccessor = document.accessors[primitive.indices]!
    const indexBufferView = document.bufferViews[indexAccessor.bufferView]!
    const indexOffset =
      binaryOffset + (indexBufferView.byteOffset ?? 0) + (indexAccessor.byteOffset ?? 0)
    if (indexAccessor.componentType !== 5123 && indexAccessor.componentType !== 5125) {
      throw new Error("Expected uint16 or uint32 triangle indices")
    }
    const indices =
      indexAccessor.componentType === 5123
        ? new Uint16Array(glb, indexOffset, indexAccessor.count)
        : new Uint32Array(glb, indexOffset, indexAccessor.count)
    for (let triangleIndex = 0; triangleIndex < indices.length; triangleIndex += 3) {
      const triangle: Vec3[] = []
      for (let cornerIndex = 0; cornerIndex < 3; cornerIndex++) {
        const positionIndex = indices[triangleIndex + cornerIndex]! * 3
        // Exported GLB (-X, Z, Y) coordinates become circuit-board (X, Y, Z).
        triangle.push([
          -(positions[positionIndex]! + translation[0]),
          positions[positionIndex + 2]! + translation[2],
          positions[positionIndex + 1]! + translation[1],
        ])
      }
      triangles.push(triangle)
    }
  }
  if (triangles.length === 0) throw new Error(`Missing ${componentName} gold contacts`)
  return jscad.geometries.geom3.fromPoints(triangles)
}
