import type { AnyCircuitElement } from "circuit-json"

type NoErcCrossId = string
type SchematicLineId = string
type SchematicPortId = string
type SchematicSheetId = string
type SchematicPoint = { x: number; y: number }
type NoErcLine = AnyCircuitElement & {
  schematic_line_id: SchematicLineId
  schematic_sheet_id?: SchematicSheetId
  x1: number
  x2: number
  y1: number
  y2: number
}
type SchematicPort = AnyCircuitElement & {
  center: SchematicPoint
  schematic_port_id: SchematicPortId
  schematic_sheet_id?: SchematicSheetId
}

const NO_ERC_LINE_ID_PATTERN = /^(schematic_line_altium_\d+)_[ab]$/u

export function findRemovedNoErcLineIds(params: {
  circuitJson: AnyCircuitElement[]
  removedSchematicPortIds: ReadonlySet<SchematicPortId>
}): Set<SchematicLineId> {
  const schematicPorts = params.circuitJson.filter(isSchematicPortWithCenter)
  const linesByCrossId = new Map<NoErcCrossId, NoErcLine[]>()
  for (const element of params.circuitJson) {
    if (!isNoErcLine(element)) continue
    const crossId = element.schematic_line_id.match(NO_ERC_LINE_ID_PATTERN)?.[1]
    if (!crossId) continue
    const lines = linesByCrossId.get(crossId) ?? []
    lines.push(element)
    linesByCrossId.set(crossId, lines)
  }

  const removedLineIds = new Set<SchematicLineId>()
  for (const lines of linesByCrossId.values()) {
    const markerLine = lines[0]
    if (!markerLine) continue
    const markerCenter = getLineCenter(markerLine)
    const nearestPort = findNearestPort({
      point: markerCenter,
      ports: schematicPorts.filter(
        (port) => port.schematic_sheet_id === markerLine.schematic_sheet_id,
      ),
    })
    if (!nearestPort) continue
    const markerLineLength = Math.hypot(
      markerLine.x2 - markerLine.x1,
      markerLine.y2 - markerLine.y1,
    )
    if (
      getDistance(markerCenter, nearestPort.center) <= markerLineLength &&
      params.removedSchematicPortIds.has(nearestPort.schematic_port_id)
    ) {
      for (const line of lines) removedLineIds.add(line.schematic_line_id)
    }
  }
  return removedLineIds
}

function findNearestPort(params: {
  point: SchematicPoint
  ports: SchematicPort[]
}): SchematicPort | undefined {
  let nearestPort: SchematicPort | undefined
  let nearestDistance = Number.POSITIVE_INFINITY
  for (const port of params.ports) {
    const distance = getDistance(params.point, port.center)
    if (distance < nearestDistance) {
      nearestPort = port
      nearestDistance = distance
    }
  }
  return nearestPort
}

function getLineCenter(line: NoErcLine): SchematicPoint {
  return { x: (line.x1 + line.x2) / 2, y: (line.y1 + line.y2) / 2 }
}

function getDistance(first: SchematicPoint, second: SchematicPoint): number {
  return Math.hypot(first.x - second.x, first.y - second.y)
}

function isNoErcLine(element: AnyCircuitElement): element is NoErcLine {
  return (
    element.type === "schematic_line" &&
    typeof element.schematic_line_id === "string" &&
    NO_ERC_LINE_ID_PATTERN.test(element.schematic_line_id) &&
    typeof element.x1 === "number" &&
    typeof element.x2 === "number" &&
    typeof element.y1 === "number" &&
    typeof element.y2 === "number"
  )
}

function isSchematicPortWithCenter(element: AnyCircuitElement): element is SchematicPort {
  return (
    element.type === "schematic_port" &&
    typeof element.schematic_port_id === "string" &&
    typeof element.center === "object" &&
    element.center !== null &&
    "x" in element.center &&
    "y" in element.center &&
    typeof element.center.x === "number" &&
    typeof element.center.y === "number"
  )
}
