import { transformPCBElements } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement } from "circuit-json"
import { compose, rotateDEG, scale, translate } from "transformation-matrix"
import {
  isPcbBoard,
  isPcbComponent,
  isPcbPort,
  isSourceComponent,
  isSourcePort,
  type SourceComponentElement,
  type SourcePortElement,
} from "./circuit-json-elements"
import type {
  PcbComponentId,
  PortHint,
  PortSelector,
  SourceComponentId,
  SourcePortId,
} from "./types"

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
  return deduplicateFootprintPortHints(
    replaceUnsupportedPcbPrimitives(
      mirrorBottomFootprintsForCore(removeOffboardPcbComponents(projectCircuitJson)),
    ),
  )
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
  const sourceComponentsById = new Map<SourceComponentId, SourceComponentElement>(
    circuitJson.filter(isSourceComponent).map((element) => [element.source_component_id, element]),
  )
  const sourcePortsById = new Map<SourcePortId, SourcePortElement>(
    circuitJson.filter(isSourcePort).map((element) => [element.source_port_id, element]),
  )
  return new Set(
    circuitJson.flatMap((element) => {
      if (!isPcbPort(element)) return []
      const sourcePort = sourcePortsById.get(element.source_port_id)
      if (!sourcePort?.source_component_id) return []
      const sourceComponent = sourceComponentsById.get(sourcePort.source_component_id)
      if (!sourceComponent?.name) return []
      const portName =
        sourcePort.pin_number !== undefined
          ? `pin${sourcePort.pin_number}`
          : sourcePort.name || sourcePort.port_hints?.[0]
      return portName ? [`.${sourceComponent.name} > .${portName}`] : []
    }),
  )
}

function mirrorBottomFootprintsForCore(circuitJson: AnyCircuitElement[]): AnyCircuitElement[] {
  const mirroredCircuitJson = structuredClone(circuitJson)
  const bottomComponents = mirroredCircuitJson
    .filter(isPcbComponent)
    .filter(({ layer }) => layer === "bottom")
  for (const component of bottomComponents) {
    const componentElements = mirroredCircuitJson.filter(
      (element) =>
        element.type !== "pcb_component" &&
        "pcb_component_id" in element &&
        element.pcb_component_id === component.pcb_component_id,
    )
    const reflectAcrossComponentYAxis = compose(
      translate(component.center.x, component.center.y),
      rotateDEG(component.rotation),
      scale(-1, 1),
      rotateDEG(-component.rotation),
      translate(-component.center.x, -component.center.y),
    )
    transformPCBElements(componentElements, reflectAcrossComponentYAxis)
  }
  return mirroredCircuitJson
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

function deduplicateFootprintPortHints(circuitJson: AnyCircuitElement[]): AnyCircuitElement[] {
  const usedPortHintsByComponent = new Map<PcbComponentId, Set<PortHint>>()
  return circuitJson.map((element) => {
    if (
      !["pcb_smtpad", "pcb_plated_hole"].includes(element.type) ||
      !("pcb_component_id" in element) ||
      typeof element.pcb_component_id !== "string" ||
      !("port_hints" in element) ||
      !Array.isArray(element.port_hints)
    ) {
      return element
    }
    const usedPortHints =
      usedPortHintsByComponent.get(element.pcb_component_id) ?? new Set<PortHint>()
    usedPortHintsByComponent.set(element.pcb_component_id, usedPortHints)
    const portHints = element.port_hints.filter((portHint) => {
      if (typeof portHint !== "string" || usedPortHints.has(portHint)) return false
      usedPortHints.add(portHint)
      return true
    })
    return { ...element, port_hints: portHints }
  })
}
