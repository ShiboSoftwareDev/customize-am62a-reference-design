import { getAllegroBoundaryKey, type AllegroBoundaryKey } from "./get-allegro-boundary-key"

type RecordTag = string
type Point = { x: number; y: number }
type PlacementBoundary = {
  footprint: string
  layer: "TOP" | "BOTTOM"
  segments: Array<{ start: Point; end: Point }>
  hasUnsupportedGeometry: boolean
}

const packageSectionHeader = "A!SYM_NAME!SYM_TYPE!COMP_DEVICE_TYPE!REFDES!CLASS!SUBCLASS!"

export function parseAllegroPlacementBoundaries(
  allegroAsciiExport: string,
): Map<AllegroBoundaryKey, string> {
  const boardSection = allegroAsciiExport.slice(
    allegroAsciiExport.indexOf("A!BOARD_NAME!BOARD_UNITS!"),
  )
  const boardUnits = boardSection
    .split(/\r?\n/u)
    .find((line) => line.startsWith("S!"))
    ?.split("!")[2]
  if (boardUnits !== "mils")
    throw new Error("Allegro placement boundaries require board units in mils")
  const sectionStart = allegroAsciiExport.indexOf(packageSectionHeader)
  if (sectionStart < 0) throw new Error("Allegro ASCII export has no package geometry section")
  const sectionLines = allegroAsciiExport.slice(sectionStart).split(/\r?\n/u)
  const boundariesByRecordTag = new Map<RecordTag, PlacementBoundary>()
  for (const line of sectionLines.slice(1)) {
    if (line.startsWith("A!")) break
    if (!line.startsWith("S!")) continue
    const fields = line.split("!")
    if (fields[5] !== "PACKAGE GEOMETRY") continue
    const subclass = fields[6]
    if (subclass !== "PLACE_BOUND_TOP" && subclass !== "PLACE_BOUND_BOTTOM") continue
    const footprint = fields[1]
    const recordTag = fields[7]?.split(" ")[0]
    if (!footprint || !recordTag) continue
    const boundary = boundariesByRecordTag.get(recordTag) ?? {
      footprint,
      layer: subclass === "PLACE_BOUND_TOP" ? "TOP" : "BOTTOM",
      segments: [],
      hasUnsupportedGeometry: false,
    }
    const coordinates = fields.slice(10, 14).map(Number)
    if (
      fields[8] !== "LINE" ||
      fields.slice(10, 14).some((coordinate) => !coordinate) ||
      coordinates.length !== 4 ||
      coordinates.some((coordinate) => !Number.isFinite(coordinate))
    ) {
      boundary.hasUnsupportedGeometry = true
    } else {
      boundary.segments.push({
        start: { x: coordinates[0], y: coordinates[1] },
        end: { x: coordinates[2], y: coordinates[3] },
      })
    }
    boundariesByRecordTag.set(recordTag, boundary)
  }

  const layerNamesByBoundaryKey = new Map<AllegroBoundaryKey, string>()
  for (const boundary of boundariesByRecordTag.values()) {
    if (boundary.hasUnsupportedGeometry || boundary.segments.length < 3) continue
    if (
      boundary.segments.some((segment, index) => {
        const next = boundary.segments[(index + 1) % boundary.segments.length]
        return segment.end.x !== next.start.x || segment.end.y !== next.start.y
      })
    )
      continue
    layerNamesByBoundaryKey.set(
      getAllegroBoundaryKey({
        ...boundary,
        points: boundary.segments.map((segment) => segment.start),
      }),
      `PLACE_BOUND_${boundary.layer}`,
    )
  }
  return layerNamesByBoundaryKey
}
