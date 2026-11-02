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

const documentByGlb = new WeakMap<ArrayBuffer, GlbDocument>()

export function readGlbComponentMesh({
  componentName,
  glb,
  materialColorFilter,
}: {
  componentName: string
  glb: ArrayBuffer
  materialColorFilter?: (color: number[] | undefined) => boolean
}) {
  const jsonChunkLength = new DataView(glb).getUint32(12, true)
  let document = documentByGlb.get(glb)
  if (!document) {
    document = JSON.parse(
      new TextDecoder().decode(new Uint8Array(glb, 20, jsonChunkLength)),
    ) as GlbDocument
    documentByGlb.set(glb, document)
  }
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
    if (materialColorFilter && !materialColorFilter(color)) continue
    const positionAccessor = document.accessors[primitive.attributes.POSITION]!
    const positionBufferView = document.bufferViews[positionAccessor.bufferView]!
    if (positionAccessor.componentType !== 5126 || positionBufferView.byteStride) {
      throw new Error("Expected packed float32 mesh positions")
    }
    const positionOffset =
      binaryOffset + (positionBufferView.byteOffset ?? 0) + (positionAccessor.byteOffset ?? 0)
    const positions = new Float32Array(
      glb.slice(positionOffset, positionOffset + positionAccessor.count * 3 * 4),
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
        ? new Uint16Array(glb.slice(indexOffset, indexOffset + indexAccessor.count * 2))
        : new Uint32Array(glb.slice(indexOffset, indexOffset + indexAccessor.count * 4))
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
  if (triangles.length === 0) throw new Error(`Missing ${componentName} mesh geometry`)
  return jscad.geometries.geom3.fromPoints(triangles)
}
