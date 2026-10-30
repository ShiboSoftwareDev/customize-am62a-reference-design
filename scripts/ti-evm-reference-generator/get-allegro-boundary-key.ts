type Point = { x: number; y: number }
export type AllegroBoundaryKey = string

export function getAllegroBoundaryKey({
  footprint,
  layer,
  points,
}: {
  footprint: string
  layer: string
  points: Point[]
}): AllegroBoundaryKey {
  // TI's Allegro ASCII export uses mils at 0.01 mil precision. Compare whole
  // edges, independently of winding and starting vertex, at that precision.
  const edges = points.flatMap((start, index) => {
    const end = points[(index + 1) % points.length]
    const endpoints = [getPointKey(start), getPointKey(end)].sort()
    return endpoints[0] === endpoints[1] ? [] : [endpoints.join(":")]
  })
  return JSON.stringify([footprint, layer, edges.sort()])
}

function getPointKey(point: Point): string {
  return `${point.x.toFixed(2)},${point.y.toFixed(2)}`
}
