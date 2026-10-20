import type { AnyCircuitElement } from "circuit-json"
import { getSupportedCopperPourOutline } from "./get-supported-copper-pours"
import type { FeatureId, SourceComponentId } from "./types"

const INNER_LAYER_NAMES = [
  "inner1",
  "inner2",
  "inner3",
  "inner4",
  "inner5",
  "inner6",
  "inner7",
  "inner8",
] as const

type PcbLayerName = "bottom" | (typeof INNER_LAYER_NAMES)[number] | "top"

type PcbElementWithLayerEndpoints = AnyCircuitElement & {
  layers: PcbLayerName[]
  type: "pcb_plated_hole" | "pcb_via"
}

type PcbComponentId = string
type SourceNetId = string
type SourcePortId = string

type PcbCopperPour = AnyCircuitElement & {
  layer: PcbLayerName
  pcb_component_id?: PcbComponentId
  source_net_id?: SourceNetId
  type: "pcb_copper_pour"
}

type PcbPort = AnyCircuitElement & {
  layers: PcbLayerName[]
  pcb_component_id: PcbComponentId
  source_port_id: SourcePortId
  type: "pcb_port"
  x: number
  y: number
}

type PcbComponent = AnyCircuitElement & {
  pcb_component_id: PcbComponentId
  source_component_id: SourceComponentId
  type: "pcb_component"
}

type SourceTrace = AnyCircuitElement & {
  connected_source_net_ids: SourceNetId[]
  connected_source_port_ids: SourcePortId[]
  type: "source_trace"
}

export function getRoutingConnectivityCheckCircuitJson(params: {
  circuitJson: AnyCircuitElement[]
  featureIdBySourceComponentId: ReadonlyMap<SourceComponentId, FeatureId>
}): AnyCircuitElement[] {
  const boardLayerStack = getBoardLayerStack(params.circuitJson)
  const pcbPorts = params.circuitJson.filter(isPcbPort)
  const sourceComponentIdByPcbComponentId = new Map<PcbComponentId, SourceComponentId>(
    params.circuitJson
      .filter(isPcbComponent)
      .map((pcbComponent) => [pcbComponent.pcb_component_id, pcbComponent.source_component_id]),
  )
  const sourceNetIdBySourcePortId = getSourceNetIdBySourcePortId(params.circuitJson)
  return params.circuitJson.map((element) => {
    if (isPcbCopperPour(element)) {
      const pcbComponentId = getLocalCopperPourPcbComponentId({
        copperPour: element,
        featureIdBySourceComponentId: params.featureIdBySourceComponentId,
        pcbPorts,
        sourceComponentIdByPcbComponentId,
        sourceNetIdBySourcePortId,
      })
      return pcbComponentId ? { ...element, pcb_component_id: pcbComponentId } : element
    }
    if (!isPcbElementWithLayerEndpoints(element)) return element

    const fromLayer = element.layers[0]
    const toLayer = element.layers[element.layers.length - 1]
    if (!fromLayer || !toLayer) return element

    const layers = getLayerSpan({ boardLayerStack, fromLayer, toLayer })
    const pcbElement = {
      ...element,
      layers,
    }
    return element.type === "pcb_via"
      ? {
          ...pcbElement,
          from_layer: fromLayer,
          to_layer: toLayer,
        }
      : pcbElement
  })
}

function getSourceNetIdBySourcePortId(
  circuitJson: AnyCircuitElement[],
): ReadonlyMap<SourcePortId, SourceNetId> {
  const sourceNetIdBySourcePortId = new Map<SourcePortId, SourceNetId>()
  for (const element of circuitJson) {
    if (!isSourceTrace(element) || element.connected_source_net_ids.length !== 1) continue
    const sourceNetId = element.connected_source_net_ids[0]
    if (!sourceNetId) continue
    for (const sourcePortId of element.connected_source_port_ids) {
      sourceNetIdBySourcePortId.set(sourcePortId, sourceNetId)
    }
  }
  return sourceNetIdBySourcePortId
}

function getLocalCopperPourPcbComponentId(params: {
  copperPour: PcbCopperPour
  featureIdBySourceComponentId: ReadonlyMap<SourceComponentId, FeatureId>
  pcbPorts: PcbPort[]
  sourceComponentIdByPcbComponentId: ReadonlyMap<PcbComponentId, SourceComponentId>
  sourceNetIdBySourcePortId: ReadonlyMap<SourcePortId, SourceNetId>
}): PcbComponentId | undefined {
  if (!params.copperPour.source_net_id) return undefined
  const outline = getSupportedCopperPourOutline(params.copperPour)
  if (!outline) return undefined
  const enclosedPcbPorts = params.pcbPorts.filter(
    (pcbPort) =>
      pcbPort.layers.includes(params.copperPour.layer) &&
      isPointInPolygon({ point: pcbPort, polygon: outline }),
  )
  if (enclosedPcbPorts.length === 0) return undefined
  if (
    enclosedPcbPorts.some(
      (pcbPort) =>
        params.sourceNetIdBySourcePortId.get(pcbPort.source_port_id) !==
        params.copperPour.source_net_id,
    )
  ) {
    return undefined
  }
  const firstEnclosedPcbPort = enclosedPcbPorts[0]
  if (!firstEnclosedPcbPort) return undefined
  if (enclosedPcbPorts.length === 1) return firstEnclosedPcbPort.pcb_component_id

  const featureIds = new Set(
    enclosedPcbPorts.map((pcbPort) => {
      const sourceComponentId = params.sourceComponentIdByPcbComponentId.get(
        pcbPort.pcb_component_id,
      )
      return sourceComponentId
        ? params.featureIdBySourceComponentId.get(sourceComponentId)
        : undefined
    }),
  )
  return featureIds.size === 1 && !featureIds.has(undefined)
    ? firstEnclosedPcbPort.pcb_component_id
    : undefined
}

function isPointInPolygon(params: {
  point: { x: number; y: number }
  polygon: Array<{ x: number; y: number }>
}): boolean {
  let isInside = false
  for (
    let currentVertexIndex = 0, previousVertexIndex = params.polygon.length - 1;
    currentVertexIndex < params.polygon.length;
    previousVertexIndex = currentVertexIndex++
  ) {
    const currentVertex = params.polygon[currentVertexIndex]
    const previousVertex = params.polygon[previousVertexIndex]
    if (!currentVertex || !previousVertex) continue
    const crossesHorizontalRay =
      currentVertex.y > params.point.y !== previousVertex.y > params.point.y
    if (!crossesHorizontalRay) continue
    const intersectionX =
      ((previousVertex.x - currentVertex.x) * (params.point.y - currentVertex.y)) /
        (previousVertex.y - currentVertex.y) +
      currentVertex.x
    if (params.point.x < intersectionX) isInside = !isInside
  }
  return isInside
}

function getBoardLayerStack(circuitJson: AnyCircuitElement[]): PcbLayerName[] {
  const board = circuitJson.find((element) => element.type === "pcb_board")
  const layerCount = board && typeof board.num_layers === "number" ? board.num_layers : 2
  const innerLayers = INNER_LAYER_NAMES.slice(0, Math.max(0, layerCount - 2))
  return layerCount === 1 ? ["top"] : ["top", ...innerLayers, "bottom"]
}

function getLayerSpan(params: {
  boardLayerStack: PcbLayerName[]
  fromLayer: PcbLayerName
  toLayer: PcbLayerName
}): PcbLayerName[] {
  const fromLayerIndex = params.boardLayerStack.indexOf(params.fromLayer)
  const toLayerIndex = params.boardLayerStack.indexOf(params.toLayer)
  if (fromLayerIndex < 0 || toLayerIndex < 0) {
    return [params.fromLayer, params.toLayer]
  }
  const firstLayerIndex = Math.min(fromLayerIndex, toLayerIndex)
  const lastLayerIndex = Math.max(fromLayerIndex, toLayerIndex)
  return params.boardLayerStack.slice(firstLayerIndex, lastLayerIndex + 1)
}

function isPcbElementWithLayerEndpoints(
  element: AnyCircuitElement,
): element is PcbElementWithLayerEndpoints {
  return (
    (element.type === "pcb_plated_hole" || element.type === "pcb_via") &&
    "layers" in element &&
    Array.isArray(element.layers) &&
    element.layers.length >= 2 &&
    element.layers.every(isPcbLayerName)
  )
}

function isPcbCopperPour(element: AnyCircuitElement): element is PcbCopperPour {
  return element.type === "pcb_copper_pour" && "layer" in element && isPcbLayerName(element.layer)
}

function isPcbPort(element: AnyCircuitElement): element is PcbPort {
  return (
    element.type === "pcb_port" &&
    "x" in element &&
    typeof element.x === "number" &&
    "y" in element &&
    typeof element.y === "number" &&
    "layers" in element &&
    Array.isArray(element.layers) &&
    element.layers.every(isPcbLayerName) &&
    "pcb_component_id" in element &&
    typeof element.pcb_component_id === "string" &&
    "source_port_id" in element &&
    typeof element.source_port_id === "string"
  )
}

function isPcbComponent(element: AnyCircuitElement): element is PcbComponent {
  return (
    element.type === "pcb_component" &&
    "pcb_component_id" in element &&
    typeof element.pcb_component_id === "string" &&
    "source_component_id" in element &&
    typeof element.source_component_id === "string"
  )
}

function isSourceTrace(element: AnyCircuitElement): element is SourceTrace {
  return (
    element.type === "source_trace" &&
    "connected_source_net_ids" in element &&
    Array.isArray(element.connected_source_net_ids) &&
    element.connected_source_net_ids.every((sourceNetId) => typeof sourceNetId === "string") &&
    "connected_source_port_ids" in element &&
    Array.isArray(element.connected_source_port_ids) &&
    element.connected_source_port_ids.every((sourcePortId) => typeof sourcePortId === "string")
  )
}

function isPcbLayerName(layerName: unknown): layerName is PcbLayerName {
  return (
    layerName === "bottom" ||
    layerName === "top" ||
    INNER_LAYER_NAMES.some((innerLayerName) => innerLayerName === layerName)
  )
}
