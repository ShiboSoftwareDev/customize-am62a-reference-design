import { parsePrebuiltCircuitJson } from "../../app/parse-prebuilt-circuit-json"
import { readGlbComponentMesh } from "./read-glb-component-mesh"
import { applyToPoint, rotateDEG } from "transformation-matrix"
import type { AnyCircuitElement } from "circuit-json"
import type { ComponentName } from "../../scripts/prebuild-ti-evm-cad-scenes/read-source-footprints"

type PlanarPoint = { x: number; y: number }

export async function readPrebuiltPackageReview(boardId: string, variantId = "full-board") {
  const directory = `public/prebuilt-ti-evms/${boardId}`
  return {
    circuitJson: parsePrebuiltCircuitJson(
      new Uint8Array(await Bun.file(`${directory}/${variantId}.circuit.json.gz`).arrayBuffer()),
    ),
    glb: await Bun.file(`${directory}/${variantId}.glb`).arrayBuffer(),
    footprints: (await Bun.file(
      `lib/generated/ti-evms/${boardId}.component-footprints.json`,
    ).json()) as Record<ComponentName, string>,
  }
}

export function findMissingPackageContacts({
  componentName,
  review,
  materialColorFilter,
}: {
  componentName: string
  materialColorFilter?: Parameters<typeof readGlbComponentMesh>[0]["materialColorFilter"]
  review: Awaited<ReturnType<typeof readPrebuiltPackageReview>>
}): string[] {
  const sourceComponent = review.circuitJson.find(
    (element) => element.type === "source_component" && element.name === componentName,
  )
  const pcbComponent = review.circuitJson.find(
    (element) =>
      element.type === "pcb_component" &&
      element.source_component_id === sourceComponent?.source_component_id,
  )
  const board = review.circuitJson.find((element) => element.type === "pcb_board")
  if (!pcbComponent || typeof board?.thickness !== "number")
    throw new Error(`Missing ${componentName} PCB`)
  const surfaceZ = ((pcbComponent.layer === "bottom" ? -1 : 1) * board.thickness) / 2
  const mesh = readGlbComponentMesh({
    componentName,
    glb: review.glb,
    materialColorFilter:
      materialColorFilter ?? ((color) => Boolean(color && Math.max(...color.slice(0, 3)) > 0.5)),
  })
  const contactTriangles = mesh.polygons.flatMap((polygon) => {
    const heights = polygon.vertices.map((vertex) => vertex[2])
    if (Math.min(...heights) > surfaceZ + 0.12 || Math.max(...heights) < surfaceZ - 0.12) return []
    return [polygon.vertices.map((vertex) => ({ x: vertex[0], y: vertex[1] }))]
  })
  const pads = review.circuitJson.filter(
    (element) =>
      element.type === "pcb_smtpad" && element.pcb_component_id === pcbComponent.pcb_component_id,
  )
  return pads.flatMap((pad) => {
    const polygon = getPadPolygon(pad)
    if (!polygon.length) return []
    return contactTriangles.some((triangle) => polygonsIntersect(triangle, polygon))
      ? []
      : [`${componentName} ${String(pad.pcb_smtpad_id)}`]
  })
}

function getPadPolygon(pad: AnyCircuitElement): PlanarPoint[] {
  if (pad.shape === "polygon" && Array.isArray(pad.points)) {
    return pad.points.filter(isPlanarPoint)
  }
  let width = 0
  if (typeof pad.width === "number") width = pad.width
  else if (typeof pad.radius === "number") width = pad.radius * 2
  const height = typeof pad.height === "number" ? pad.height : width
  if (Math.max(width, height) < 0.06) return []
  if (typeof pad.x !== "number" || typeof pad.y !== "number")
    throw new Error("Missing pad coordinates")
  const center = { x: pad.x, y: pad.y }
  const padToBoardTransform = rotateDEG(typeof pad.ccw_rotation === "number" ? pad.ccw_rotation : 0)
  return [
    [-1, -1],
    [-1, 1],
    [1, 1],
    [1, -1],
  ].map(([sideX, sideY]) => {
    const corner = applyToPoint(padToBoardTransform, {
      x: (sideX! * width) / 2,
      y: (sideY! * height) / 2,
    })
    return { x: center.x + corner.x, y: center.y + corner.y }
  })
}

function polygonsIntersect(firstPolygon: PlanarPoint[], secondPolygon: PlanarPoint[]): boolean {
  for (const polygon of [firstPolygon, secondPolygon]) {
    for (let edgeIndex = 0; edgeIndex < polygon.length; edgeIndex++) {
      const start = polygon[edgeIndex]!
      const end = polygon[(edgeIndex + 1) % polygon.length]!
      const axis = { x: start.y - end.y, y: end.x - start.x }
      if (Math.abs(axis.x) + Math.abs(axis.y) < 1e-9) continue
      const firstProjections = firstPolygon.map((point) => point.x * axis.x + point.y * axis.y)
      const secondProjections = secondPolygon.map((point) => point.x * axis.x + point.y * axis.y)
      if (
        Math.max(...firstProjections) < Math.min(...secondProjections) - 1e-5 ||
        Math.max(...secondProjections) < Math.min(...firstProjections) - 1e-5
      )
        return false
    }
  }
  return true
}

function isPlanarPoint(point: unknown): point is PlanarPoint {
  return (
    typeof point === "object" &&
    point !== null &&
    "x" in point &&
    "y" in point &&
    typeof point.x === "number" &&
    typeof point.y === "number"
  )
}
