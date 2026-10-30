import type { AnyCircuitElement } from "circuit-json"
import type { ComputedCopperPourSettings } from "./copper-pour-settings"
import {
  type CopperPolygon,
  copperPolygonsOverlap,
  expandCopperKeepout,
  subtractCopperKeepouts,
} from "./copper-keepout-geometry"
import type { SourceCopperKeepout } from "./get-source-copper-keepouts"
import type { FeatureId } from "./types"

type Point = { x: number; y: number }
type AuthoredCopperPour = AnyCircuitElement & {
  type: "pcb_copper_pour"
  pcb_copper_pour_id: string
  shape: "polygon" | "brep"
  points?: Point[]
  brep_shape?: { outer_ring: { vertices: Point[] }; inner_rings?: Array<{ vertices: Point[] }> }
}

export function isAuthoredCopperPour(element: AnyCircuitElement): element is AuthoredCopperPour {
  return (
    element.type === "pcb_copper_pour" &&
    typeof element.pcb_copper_pour_id === "string" &&
    (element.shape === "polygon" || element.shape === "brep")
  )
}

export function clipCopperPourKeepouts({
  copperPour,
  keepouts,
  settings,
}: {
  copperPour: AuthoredCopperPour
  keepouts: SourceCopperKeepout[]
  settings: ComputedCopperPourSettings
}): Array<{ copperPour: AuthoredCopperPour; settings: ComputedCopperPourSettings }> {
  if (keepouts.length === 0) return [{ copperPour, settings }]
  const sourceRings =
    copperPour.shape === "polygon"
      ? [copperPour.points ?? []]
      : [
          copperPour.brep_shape?.outer_ring.vertices ?? [],
          ...(copperPour.brep_shape?.inner_rings ?? []).map((ring) => ring.vertices),
        ]
  const polygon: CopperPolygon = sourceRings.map((ring) =>
    ring.map(({ x, y }): [number, number] => [x, y]),
  )
  const expandedKeepouts = keepouts
    .map((keepout) => ({
      ...keepout,
      polygon: expandCopperKeepout({ polygon: keepout.polygon, clearance: settings.clearance }),
    }))
    .filter((keepout) => copperPolygonsOverlap(polygon, keepout.polygon))
  if (expandedKeepouts.length === 0) return [{ copperPour, settings }]
  const featureIds = [
    ...new Set<FeatureId>(
      expandedKeepouts.flatMap((keepout) =>
        keepout.removableFeatureId ? [keepout.removableFeatureId] : [],
      ),
    ),
  ].sort()
  const variants: Array<{ copperPour: AuthoredCopperPour; settings: ComputedCopperPourSettings }> =
    []
  for (let combinationIndex = 0; combinationIndex < 2 ** featureIds.length; combinationIndex++) {
    const absentFeatureIds = featureIds.filter(
      (_, index) => (combinationIndex & (1 << index)) !== 0,
    )
    const presentFeatureIds = featureIds.filter(
      (featureId) => !absentFeatureIds.includes(featureId),
    )
    const activeKeepouts = expandedKeepouts.filter(
      (keepout) =>
        !keepout.removableFeatureId || !absentFeatureIds.includes(keepout.removableFeatureId),
    )
    const clippedPolygons = subtractCopperKeepouts({
      polygon,
      keepouts: activeKeepouts.map((keepout) => keepout.polygon),
    })
    for (const [partIndex, clippedPolygon] of clippedPolygons.entries()) {
      const [outerRing, ...holes] = clippedPolygon.map((ring) => ring.map(([x, y]) => ({ x, y })))
      if (!outerRing || outerRing.length < 3) continue
      // Keep the existing Circuit JSON -> TSX converter responsible for encoding
      // BRep holes into the supported <copperpour outline={...}> representation.
      const { points: _points, brep_shape: _brepShape, ...sharedProperties } = copperPour
      variants.push({
        copperPour: {
          ...sharedProperties,
          pcb_copper_pour_id: `${copperPour.pcb_copper_pour_id}_keepouts_${combinationIndex}_${partIndex}`,
          shape: "brep",
          brep_shape: {
            outer_ring: { vertices: outerRing },
            inner_rings: holes.map((vertices) => ({ vertices })),
          },
        },
        settings: { ...settings, presentFeatureIds, absentFeatureIds },
      })
    }
  }
  return variants
}
