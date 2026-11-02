import { expect } from "bun:test"
import jscad from "@jscad/modeling"
import type { Geom2, Geom3 } from "@jscad/modeling/src/geometries/types"
import type { Vec2 } from "@jscad/modeling/src/maths/types"
import { applyToPoint, compose, rotateDEG, translate } from "transformation-matrix"
import { parsePrebuiltCircuitJson } from "../../app/parse-prebuilt-circuit-json"
import { getTiEvm, type TiEvmId } from "../../lib/ti-evm-catalog"
import type { ComponentName } from "../../scripts/prebuild-ti-evm-cad-scenes/read-source-footprints"
import { readGlbComponentMesh } from "./read-glb-component-mesh"

export async function expectPrebuiltIcLeadContacts({
  componentNames,
  evmId,
}: {
  componentNames: ComponentName[]
  evmId: TiEvmId
}): Promise<void> {
  const missedContacts: string[] = []
  for (const variant of getTiEvm(evmId).variants) {
    const circuitJson = parsePrebuiltCircuitJson(
      new Uint8Array(await Bun.file(`public${variant.circuitJsonUrl}`).arrayBuffer()),
    )
    const glb = await Bun.file(`public${variant.prebuiltCadSceneUrl}`).arrayBuffer()
    const pcbBoard = circuitJson.find((element) => element.type === "pcb_board")
    if (typeof pcbBoard?.thickness !== "number") throw new Error("Missing board thickness")

    for (const componentName of componentNames) {
      const sourceComponent = circuitJson.find(
        (element) => element.type === "source_component" && element.name === componentName,
      )
      const pcbComponent = circuitJson.find(
        (element) =>
          element.type === "pcb_component" &&
          element.source_component_id === sourceComponent?.source_component_id,
      )
      if (!pcbComponent) throw new Error(`Missing ${evmId} ${componentName}`)
      const leads = readGlbComponentMesh({
        componentName,
        glb,
        materialColorFilter: isTinMaterial,
      })
      const boardNormalDirection = pcbComponent.layer === "bottom" ? -1 : 1
      const leadContactFootprint = getLeadContactFootprint({
        leadMesh: leads,
        boardSurfaceZ: boardNormalDirection * (pcbBoard.thickness / 2),
      })
      const pads = circuitJson.filter(
        (element) =>
          element.type === "pcb_smtpad" &&
          element.pcb_component_id === pcbComponent.pcb_component_id &&
          typeof element.width === "number" &&
          typeof element.height === "number" &&
          Math.max(element.width, element.height) / Math.min(element.width, element.height) > 1.5,
      )
      // The exposed thermal pad on U8 is separate from its eight gull-wing leads.
      expect(pads, `${evmId} ${variant.id} ${componentName}`).toHaveLength(8)
      for (const pad of pads) {
        if (
          typeof pad.x !== "number" ||
          typeof pad.y !== "number" ||
          typeof pad.width !== "number" ||
          typeof pad.height !== "number"
        )
          throw new Error("Missing rectangular pad geometry")
        const padCcwRotationDegrees = typeof pad.ccw_rotation === "number" ? pad.ccw_rotation : 0
        const padToBoardTransform = compose(
          translate(pad.x, pad.y),
          rotateDEG(padCcwRotationDegrees),
        )
        const padCorners: Vec2[] = [
          [-pad.width / 2, -pad.height / 2],
          [pad.width / 2, -pad.height / 2],
          [pad.width / 2, pad.height / 2],
          [-pad.width / 2, pad.height / 2],
        ]
        const padContactRegion = jscad.geometries.geom2.fromPoints(
          padCorners.map((point) => applyToPoint(padToBoardTransform, point)),
        )
        const contactArea = jscad.measurements.measureArea(
          jscad.booleans.intersect(leadContactFootprint, padContactRegion),
        )
        if (contactArea < 0.000001) {
          missedContacts.push(`${evmId} ${variant.id} ${componentName} ${pad.pcb_smtpad_id}`)
        }
      }
    }
  }
  expect(missedContacts).toEqual([])
}

function getLeadContactFootprint({
  boardSurfaceZ,
  leadMesh,
}: {
  boardSurfaceZ: number
  leadMesh: Geom3
}): Geom2 {
  // Project only metal faces on the PCB surface into board XY coordinates.
  // GLB meshes contain separate solids, so do not treat the whole mesh as one CSG solid.
  const contactFaces = jscad.geometries.geom3.toPolygons(leadMesh).flatMap(({ vertices }) => {
    if (!vertices.every((point) => Math.abs(point[2] - boardSurfaceZ) < 0.00001)) return []
    const footprint = jscad.geometries.geom2.fromPoints(vertices.map(([x, y]): Vec2 => [x, y]))
    const signedArea = jscad.measurements.measureArea(footprint)
    if (Math.abs(signedArea) < 0.000001) return []
    return [signedArea < 0 ? jscad.geometries.geom2.reverse(footprint) : footprint]
  })
  if (contactFaces.length === 0) throw new Error("Missing metal contact faces on the PCB surface")
  return jscad.booleans.union(...contactFaces)
}

function isTinMaterial(color: number[] | undefined): boolean {
  return Boolean(color && color[0]! > 0.5 && color[1]! > 0.5 && color[2]! > 0.5)
}
