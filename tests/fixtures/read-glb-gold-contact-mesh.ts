import { readGlbComponentMesh } from "./read-glb-component-mesh"

export function readGlbGoldContactMesh({
  componentName,
  glb,
}: {
  componentName: string
  glb: ArrayBuffer
}) {
  return readGlbComponentMesh({ componentName, glb, materialColorFilter: isGoldMaterial })
}

function isGoldMaterial(color: number[] | undefined): boolean {
  return Boolean(color && color[0]! >= 0.5 && color[1]! >= 0.3 && color[2]! <= 0.3)
}
