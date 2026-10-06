import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
} from "three"
import { GLTFExporter } from "three-stdlib"

type FaceColorKey = string

type OcctBrepFace = {
  first: number
  last: number
  color: [number, number, number] | null
}

type OcctMesh = {
  name: string
  color?: [number, number, number]
  brep_faces?: OcctBrepFace[]
  attributes: {
    position: { array: number[] }
    normal?: { array: number[] }
  }
  index: { array: number[] }
}

type OcctImport = {
  ReadStepFile: (
    content: ArrayBufferView | ArrayBuffer,
    params: { linearUnit: "millimeter" },
  ) => { success: boolean; meshes: OcctMesh[] }
}

type OcctImportFactory = () => Promise<OcctImport>

const defaultColor = new Color(0.82, 0.82, 0.82)

let occtImportPromise: Promise<OcctImport> | undefined

export async function convertStepToGlb(params: { stepBytes: Uint8Array }): Promise<ArrayBuffer> {
  const occt = await loadOcctImport()
  const result = occt.ReadStepFile(params.stepBytes, { linearUnit: "millimeter" })
  if (!result.success || result.meshes.length === 0) {
    throw new Error("occt-import-js failed to convert embedded STEP model")
  }

  const exporter = new GLTFExporter()
  return new Promise<ArrayBuffer>((resolve, reject) => {
    exporter.parse(
      createModelGroup(result.meshes),
      (output) => {
        if (output instanceof ArrayBuffer) {
          resolve(output)
        } else {
          reject(new Error("GLTFExporter did not return binary output"))
        }
      },
      reject,
      { binary: true },
    )
  })
}

async function loadOcctImport(): Promise<OcctImport> {
  if (!occtImportPromise) {
    const imported = (await import("occt-import-js")) as {
      default: OcctImportFactory
    }
    occtImportPromise = imported.default()
  }
  return occtImportPromise
}

function createModelGroup(meshes: OcctMesh[]): Group {
  const group = new Group()
  for (const mesh of meshes) {
    const positions = mesh.attributes.position?.array ?? []
    const indices = mesh.index?.array ?? []
    if (positions.length === 0 || indices.length === 0) continue

    const geometry = new BufferGeometry()
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3))
    const normals = mesh.attributes.normal?.array ?? []
    if (normals.length > 0) {
      geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3))
    } else {
      geometry.computeVertexNormals()
    }
    geometry.setIndex(indices)
    geometry.clearGroups()

    const materials = applyFaceColorGroups({ geometry, mesh })
    const modelMesh = new Mesh(geometry, materials.length > 1 ? materials : materials[0])
    modelMesh.name = mesh.name
    group.add(modelMesh)
  }
  return group
}

function applyFaceColorGroups(params: {
  geometry: BufferGeometry
  mesh: OcctMesh
}): MeshStandardMaterial[] {
  const defaultMaterial = createMaterial(params.mesh.color)
  const brepFaces = params.mesh.brep_faces ?? []
  if (brepFaces.length === 0) return [defaultMaterial]

  const sortedBrepFaces =
    brepFaces.length > 1
      ? [...brepFaces].sort((first, second) => first.first - second.first)
      : brepFaces
  const materials = [defaultMaterial]
  const materialIndexByColor = new Map<FaceColorKey, number>()
  const triangleCount = params.mesh.index.array.length / 3
  let triangleIndex = 0
  let faceIndex = 0

  const getMaterialIndex = (color: [number, number, number] | null): number => {
    if (!color) return 0
    const colorKey = color.join(",")
    const existingIndex = materialIndexByColor.get(colorKey)
    if (existingIndex !== undefined) return existingIndex
    const materialIndex = materials.length
    materials.push(createMaterial(color))
    materialIndexByColor.set(colorKey, materialIndex)
    return materialIndex
  }

  while (triangleIndex < triangleCount) {
    const face = sortedBrepFaces[faceIndex]
    let lastTriangleExclusive = triangleCount
    let materialIndex = 0
    if (face) {
      if (triangleIndex < face.first) {
        lastTriangleExclusive = face.first
      } else {
        lastTriangleExclusive = face.last + 1
        materialIndex = getMaterialIndex(face.color)
        faceIndex += 1
      }
    }
    if (lastTriangleExclusive > triangleIndex) {
      params.geometry.addGroup(
        triangleIndex * 3,
        (lastTriangleExclusive - triangleIndex) * 3,
        materialIndex,
      )
    }
    triangleIndex = lastTriangleExclusive
  }

  return materials
}

function createMaterial(color?: [number, number, number] | null): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: color ? new Color(color[0], color[1], color[2]) : defaultColor,
  })
}
