type SchematicPoint = { x: number; y: number }
type SchematicPointKey = string
type SchematicTraceEdgeIndex = number

export type SchematicTraceEdge = {
  from: SchematicPoint
  from_schematic_port_id?: string
  to: SchematicPoint
  to_schematic_port_id?: string
  [property: string]: unknown
}

export function pruneUnanchoredSchematicTraceEdges(params: {
  anchorPoints: SchematicPoint[]
  edges: SchematicTraceEdge[]
}): SchematicTraceEdge[] {
  const edgesByPoint = new Map<SchematicPointKey, SchematicTraceEdgeIndex[]>()
  const anchoredPointKeys = new Set<SchematicPointKey>(
    params.anchorPoints.map(getSchematicPointKey),
  )
  for (const [edgeIndex, edge] of params.edges.entries()) {
    for (const point of [edge.from, edge.to]) {
      const pointKey = getSchematicPointKey(point)
      const edgeIndexes = edgesByPoint.get(pointKey) ?? []
      edgeIndexes.push(edgeIndex)
      edgesByPoint.set(pointKey, edgeIndexes)
    }
    if (edge.from_schematic_port_id) {
      anchoredPointKeys.add(getSchematicPointKey(edge.from))
    }
    if (edge.to_schematic_port_id) {
      anchoredPointKeys.add(getSchematicPointKey(edge.to))
    }
  }

  const visitedEdgeIndexes = new Set<SchematicTraceEdgeIndex>()
  const activeEdgeIndexes = new Set<SchematicTraceEdgeIndex>()
  for (const startingEdgeIndex of params.edges.keys()) {
    if (visitedEdgeIndexes.has(startingEdgeIndex)) continue
    const pendingEdgeIndexes = [startingEdgeIndex]
    const connectedEdgeIndexes: SchematicTraceEdgeIndex[] = []
    let hasAnchor = false

    while (pendingEdgeIndexes.length > 0) {
      const edgeIndex = pendingEdgeIndexes.pop()
      if (edgeIndex === undefined || visitedEdgeIndexes.has(edgeIndex)) continue
      visitedEdgeIndexes.add(edgeIndex)
      connectedEdgeIndexes.push(edgeIndex)

      const edge = params.edges[edgeIndex]
      if (!edge) continue
      for (const point of [edge.from, edge.to]) {
        const pointKey = getSchematicPointKey(point)
        if (anchoredPointKeys.has(pointKey)) hasAnchor = true
        pendingEdgeIndexes.push(...(edgesByPoint.get(pointKey) ?? []))
      }
    }

    if (!hasAnchor) continue
    for (const edgeIndex of connectedEdgeIndexes) activeEdgeIndexes.add(edgeIndex)
  }

  let removedEdgeCount: number
  do {
    removedEdgeCount = 0
    for (const [pointKey, edgeIndexes] of edgesByPoint) {
      if (anchoredPointKeys.has(pointKey)) continue
      const activeIndexesAtPoint = edgeIndexes.filter((edgeIndex) =>
        activeEdgeIndexes.has(edgeIndex),
      )
      if (activeIndexesAtPoint.length !== 1) continue
      activeEdgeIndexes.delete(activeIndexesAtPoint[0])
      removedEdgeCount += 1
    }
  } while (removedEdgeCount > 0)

  return params.edges.filter((_, edgeIndex) => activeEdgeIndexes.has(edgeIndex))
}

function getSchematicPointKey(point: SchematicPoint): SchematicPointKey {
  return `${point.x},${point.y}`
}
