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

export function pruneSchematicTraceEdgesAfterPortRemoval(params: {
  anchorPoints: SchematicPoint[]
  edges: SchematicTraceEdge[]
  removedSchematicPortIds: ReadonlySet<string>
}): SchematicTraceEdge[] {
  const activeEdges = new Set<SchematicTraceEdge>()
  for (const connectedEdges of getConnectedEdgeGroups(params.edges)) {
    const hasRemovedPortEdge = connectedEdges.some(
      (edge) =>
        params.removedSchematicPortIds.has(edge.from_schematic_port_id ?? "") ||
        params.removedSchematicPortIds.has(edge.to_schematic_port_id ?? ""),
    )
    if (!hasRemovedPortEdge) {
      for (const edge of connectedEdges) activeEdges.add(edge)
      continue
    }
    const edgesWithoutRemovedPorts = connectedEdges.filter(
      (edge) =>
        !params.removedSchematicPortIds.has(edge.from_schematic_port_id ?? "") &&
        !params.removedSchematicPortIds.has(edge.to_schematic_port_id ?? ""),
    )
    for (const edge of pruneUnanchoredSchematicTraceEdges({
      anchorPoints: params.anchorPoints,
      edges: edgesWithoutRemovedPorts,
    })) {
      activeEdges.add(edge)
    }
  }
  return params.edges.filter((edge) => activeEdges.has(edge))
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

function getConnectedEdgeGroups(edges: SchematicTraceEdge[]): SchematicTraceEdge[][] {
  const edgesByPoint = new Map<SchematicPointKey, SchematicTraceEdge[]>()
  for (const edge of edges) {
    for (const point of [edge.from, edge.to]) {
      const pointKey = getSchematicPointKey(point)
      const connectedEdges = edgesByPoint.get(pointKey) ?? []
      connectedEdges.push(edge)
      edgesByPoint.set(pointKey, connectedEdges)
    }
  }

  const visitedEdges = new Set<SchematicTraceEdge>()
  const connectedEdgeGroups: SchematicTraceEdge[][] = []
  for (const startingEdge of edges) {
    if (visitedEdges.has(startingEdge)) continue
    const pendingEdges = [startingEdge]
    const connectedEdges: SchematicTraceEdge[] = []
    while (pendingEdges.length > 0) {
      const edge = pendingEdges.pop()
      if (!edge || visitedEdges.has(edge)) continue
      visitedEdges.add(edge)
      connectedEdges.push(edge)
      for (const point of [edge.from, edge.to]) {
        pendingEdges.push(...(edgesByPoint.get(getSchematicPointKey(point)) ?? []))
      }
    }
    connectedEdgeGroups.push(connectedEdges)
  }
  return connectedEdgeGroups
}
