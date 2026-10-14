import type { AnyCircuitElement } from "circuit-json"
import {
  isPcbBoard,
  isPcbComponent,
  isPcbPort,
  isSourceComponent,
  isSourcePort,
  type PcbPortElement,
  type SourceComponentElement,
  type SourcePortElement,
} from "./circuit-json-elements"
import type { ComponentName, PortSelector, SourceComponentId, SourcePortId } from "./types"

type CircuitPoint = { x: number; y: number }

type PcbSilkscreenGraphicElement = AnyCircuitElement & {
  type: "pcb_silkscreen_graphic"
  brep_shape: { outer_ring: { vertices: CircuitPoint[] } }
  layer: string
  pcb_component_id?: string
  pcb_silkscreen_graphic_id: string
}

type PcbOutlineKeepoutElement = AnyCircuitElement & {
  type: "pcb_keepout"
  shape: "outline"
  outline: CircuitPoint[]
}

export function prepareConverterCircuitJson(
  projectCircuitJson: AnyCircuitElement[],
): AnyCircuitElement[] {
  return replaceUnsupportedPcbPrimitives(removeOffboardPcbComponents(projectCircuitJson))
}

function removeOffboardPcbComponents(circuitJson: AnyCircuitElement[]): AnyCircuitElement[] {
  const board = circuitJson.find(isPcbBoard)
  if (!board) return circuitJson

  const minimumX = board.center.x - board.width / 2
  const maximumX = board.center.x + board.width / 2
  const minimumY = board.center.y - board.height / 2
  const maximumY = board.center.y + board.height / 2
  const offboardAnnotationComponentIds = new Set(
    circuitJson.flatMap((element) => {
      if (
        !isPcbComponent(element) ||
        hasPhysicalPcbPrimitive({
          circuitJson,
          pcbComponentId: element.pcb_component_id,
        }) ||
        (element.center.x >= minimumX &&
          element.center.x <= maximumX &&
          element.center.y >= minimumY &&
          element.center.y <= maximumY)
      ) {
        return []
      }
      return [element.pcb_component_id]
    }),
  )

  return circuitJson.filter(
    (element) =>
      !("pcb_component_id" in element) ||
      typeof element.pcb_component_id !== "string" ||
      !offboardAnnotationComponentIds.has(element.pcb_component_id),
  )
}

function hasPhysicalPcbPrimitive(params: {
  circuitJson: AnyCircuitElement[]
  pcbComponentId: string
}): boolean {
  return params.circuitJson.some(
    (element) =>
      ["pcb_smtpad", "pcb_plated_hole"].includes(element.type) &&
      "pcb_component_id" in element &&
      element.pcb_component_id === params.pcbComponentId,
  )
}

export function getRoutablePortSelectors(circuitJson: AnyCircuitElement[]): Set<PortSelector> {
  return new Set(getPortSelectorReplacements(circuitJson).values())
}

export function getPortSelectorReplacements(
  circuitJson: AnyCircuitElement[],
): Map<PortSelector, PortSelector> {
  const sourceComponentsById = new Map<SourceComponentId, SourceComponentElement>(
    circuitJson.filter(isSourceComponent).map((element) => [element.source_component_id, element]),
  )
  const sourcePortsById = new Map<SourcePortId, SourcePortElement>(
    circuitJson.filter(isSourcePort).map((element) => [element.source_port_id, element]),
  )
  const replacements = new Map<PortSelector, PortSelector>()
  let importedPcbPortIndex = 0
  for (const element of circuitJson) {
    if (!isPcbPort(element)) continue
    importedPcbPortIndex += 1
    const canonicalPort = getCanonicalPort({
      pcbPort: element,
      sourceComponentsById,
      sourcePortsById,
    })
    if (!canonicalPort) continue
    replacements.set(
      `.${canonicalPort.componentName} > .imported_pcb_port_${importedPcbPortIndex}`,
      canonicalPort.selector,
    )
  }
  return replacements
}

function getCanonicalPort(params: {
  pcbPort: PcbPortElement
  sourceComponentsById: ReadonlyMap<SourceComponentId, SourceComponentElement>
  sourcePortsById: ReadonlyMap<SourcePortId, SourcePortElement>
}): { componentName: ComponentName; selector: PortSelector } | undefined {
  const sourcePort = params.sourcePortsById.get(params.pcbPort.source_port_id)
  if (!sourcePort?.source_component_id) return undefined
  const sourceComponent = params.sourceComponentsById.get(sourcePort.source_component_id)
  if (!sourceComponent?.name) return undefined
  const portName =
    sourcePort.pin_number !== undefined
      ? `pin${sourcePort.pin_number}`
      : sourcePort.name || sourcePort.port_hints?.[0]
  return portName
    ? {
        componentName: sourceComponent.name,
        selector: `.${sourceComponent.name} > .${portName}`,
      }
    : undefined
}

function replaceUnsupportedPcbPrimitives(circuitJson: AnyCircuitElement[]): AnyCircuitElement[] {
  return circuitJson.flatMap((element) => {
    if (isPcbSilkscreenGraphic(element)) {
      const vertices = element.brep_shape.outer_ring.vertices
      const firstVertex = vertices[0]
      if (!firstVertex || vertices.length < 2) return []
      return [
        {
          type: "pcb_silkscreen_path",
          pcb_silkscreen_path_id: element.pcb_silkscreen_graphic_id.replace(
            "pcb_silkscreen_graphic",
            "pcb_silkscreen_path",
          ),
          pcb_component_id: element.pcb_component_id,
          route: [...vertices, { ...firstVertex }],
          stroke_width: 0.1,
          layer: element.layer,
        },
      ]
    }
    if (isPcbOutlineKeepout(element)) {
      const xs = element.outline.map(({ x }) => x)
      const ys = element.outline.map(({ y }) => y)
      if (xs.length === 0 || ys.length === 0) return []
      const minimumX = Math.min(...xs)
      const maximumX = Math.max(...xs)
      const minimumY = Math.min(...ys)
      const maximumY = Math.max(...ys)
      const width = maximumX - minimumX
      const height = maximumY - minimumY
      const center = {
        x: (minimumX + maximumX) / 2,
        y: (minimumY + maximumY) / 2,
      }
      const sharedProperties = {
        type: "pcb_keepout" as const,
        pcb_keepout_id: element.pcb_keepout_id,
        layers: element.layers,
        allow_traces: element.allow_traces,
        allow_placements: element.allow_placements,
        warning_only: element.warning_only,
        description: element.description,
      }
      if (Math.abs(width - height) <= 0.001) {
        return [{ ...sharedProperties, shape: "circle" as const, center, radius: width / 2 }]
      }
      return [{ ...sharedProperties, shape: "rect" as const, center, width, height }]
    }
    return [element]
  })
}

function isPcbSilkscreenGraphic(
  element: AnyCircuitElement,
): element is PcbSilkscreenGraphicElement {
  if (
    element.type !== "pcb_silkscreen_graphic" ||
    typeof element.pcb_silkscreen_graphic_id !== "string" ||
    typeof element.layer !== "string" ||
    !isRecord(element.brep_shape)
  ) {
    return false
  }
  const outerRing = element.brep_shape.outer_ring
  return (
    isRecord(outerRing) &&
    Array.isArray(outerRing.vertices) &&
    outerRing.vertices.every(isCircuitPoint)
  )
}

function isPcbOutlineKeepout(element: AnyCircuitElement): element is PcbOutlineKeepoutElement {
  return (
    element.type === "pcb_keepout" &&
    element.shape === "outline" &&
    Array.isArray(element.outline) &&
    element.outline.every(isCircuitPoint)
  )
}

function isCircuitPoint(candidate: unknown): candidate is CircuitPoint {
  return isRecord(candidate) && typeof candidate.x === "number" && typeof candidate.y === "number"
}

function isRecord(candidate: unknown): candidate is Record<string, unknown> {
  return typeof candidate === "object" && candidate !== null
}
