import { type CrossSection, getManifoldModule } from "@tscircuit/manifold-2d"
import { applyToPoint, scale } from "transformation-matrix"

export type CopperPolygon = Array<Array<[number, number]>>

const manifold = await getManifoldModule()
const nativeUnitsPerMillimeter = 10_000
const millimetersToNativeTransform = scale(nativeUnitsPerMillimeter)
const nativeToMillimetersTransform = scale(1 / nativeUnitsPerMillimeter)

export function expandCopperKeepout({
  polygon,
  clearance,
}: {
  polygon: CopperPolygon
  clearance: number
}): CopperPolygon {
  if (clearance <= 0) return polygon
  const keepoutSection = createNativeSection(polygon)
  let expandedKeepoutSection: CrossSection | undefined
  try {
    expandedKeepoutSection = keepoutSection.offset(
      clearance * nativeUnitsPerMillimeter,
      "Round",
      2,
      32,
    )
    return getMillimeterPolygon(expandedKeepoutSection)
  } finally {
    expandedKeepoutSection?.delete()
    keepoutSection.delete()
  }
}

export function copperPolygonsOverlap(first: CopperPolygon, second: CopperPolygon): boolean {
  const firstSection = createNativeSection(first)
  const secondSection = createNativeSection(second)
  let intersection: CrossSection | undefined
  try {
    intersection = firstSection.intersect(secondSection)
    return !intersection.isEmpty()
  } finally {
    intersection?.delete()
    secondSection.delete()
    firstSection.delete()
  }
}

export function subtractCopperKeepouts({
  polygon,
  keepouts,
}: {
  polygon: CopperPolygon
  keepouts: CopperPolygon[]
}): CopperPolygon[] {
  if (keepouts.length === 0) return [polygon]
  const ownedSections: CrossSection[] = []
  try {
    const sourceSection = createNativeSection(polygon)
    ownedSections.push(sourceSection)
    const keepoutSections: CrossSection[] = []
    for (const keepout of keepouts) {
      const section = createNativeSection(keepout)
      ownedSections.push(section)
      keepoutSections.push(section)
    }
    // Union restrictions: overlapping keepouts must not cancel each other out.
    const keepoutUnion = manifold.CrossSection.union(keepoutSections)
    ownedSections.push(keepoutUnion)
    const remainingCopper = sourceSection.subtract(keepoutUnion)
    ownedSections.push(remainingCopper)
    const islands = remainingCopper.decompose()
    ownedSections.push(...islands)
    return islands.map(getMillimeterPolygon)
  } finally {
    for (const section of ownedSections.reverse()) section.delete()
  }
}

function createNativeSection(polygon: CopperPolygon): CrossSection {
  const nativeRings = polygon.map((ring) =>
    ring.map(([x, y]): [number, number] => {
      const point = applyToPoint(millimetersToNativeTransform, { x, y })
      return [point.x, point.y]
    }),
  )
  return manifold.CrossSection.ofPolygons(nativeRings, "EvenOdd")
}

function getMillimeterPolygon(section: CrossSection): CopperPolygon {
  return section.toPolygons().map((ring) =>
    ring.map(([x, y]): [number, number] => {
      const point = applyToPoint(nativeToMillimetersTransform, { x, y })
      return [point.x, point.y]
    }),
  )
}
