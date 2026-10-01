import type { AnyCircuitElement } from "circuit-json"
import type { ComponentName, PcbComponentId, SourceComponentId, SourcePortId } from "./types"

type Point = { x: number; y: number }

export type PcbBoardElement = AnyCircuitElement & {
  type: "pcb_board"
  center: Point
  height: number
  num_layers: number
  outline: Point[]
  thickness: number
  width: number
}

export type PcbComponentElement = AnyCircuitElement & {
  type: "pcb_component"
  center: Point
  layer: string
  pcb_component_id: PcbComponentId
  rotation: number
  source_component_id: SourceComponentId
}

export type SourceComponentElement = AnyCircuitElement & {
  type: "source_component"
  display_value?: string
  name: ComponentName
  source_component_id: SourceComponentId
}

export type SourcePortElement = AnyCircuitElement & {
  type: "source_port"
  name?: string
  pin_number?: string | number
  port_hints?: string[]
  source_component_id?: SourceComponentId
  source_port_id: SourcePortId
}

export type PcbPortElement = AnyCircuitElement & {
  type: "pcb_port"
  source_port_id: SourcePortId
}

export type SchematicComponentElement = AnyCircuitElement & {
  type: "schematic_component"
  center: Point
  schematic_component_id: string
  size: { width: number; height: number }
  source_component_id: SourceComponentId
}

export type SchematicPortElement = AnyCircuitElement & {
  type: "schematic_port"
  center: Point
  schematic_component_id: string
  side_of_component: "left" | "right" | "top" | "bottom"
  source_port_id: SourcePortId
}

export function isPcbBoard(element: AnyCircuitElement): element is PcbBoardElement {
  return (
    element.type === "pcb_board" &&
    isPoint(element.center) &&
    typeof element.width === "number" &&
    typeof element.height === "number" &&
    typeof element.thickness === "number" &&
    typeof element.num_layers === "number" &&
    Array.isArray(element.outline)
  )
}

export function isPcbComponent(element: AnyCircuitElement): element is PcbComponentElement {
  return (
    element.type === "pcb_component" &&
    typeof element.pcb_component_id === "string" &&
    typeof element.source_component_id === "string" &&
    isPoint(element.center) &&
    typeof element.rotation === "number" &&
    typeof element.layer === "string"
  )
}

export function isSourceComponent(element: AnyCircuitElement): element is SourceComponentElement {
  return (
    element.type === "source_component" &&
    typeof element.source_component_id === "string" &&
    typeof element.name === "string"
  )
}

export function isSourcePort(element: AnyCircuitElement): element is SourcePortElement {
  return element.type === "source_port" && typeof element.source_port_id === "string"
}

export function isPcbPort(element: AnyCircuitElement): element is PcbPortElement {
  return element.type === "pcb_port" && typeof element.source_port_id === "string"
}

export function isSchematicComponent(
  element: AnyCircuitElement,
): element is SchematicComponentElement {
  return (
    element.type === "schematic_component" &&
    typeof element.schematic_component_id === "string" &&
    typeof element.source_component_id === "string" &&
    isPoint(element.center) &&
    isSize(element.size)
  )
}

export function isSchematicPort(element: AnyCircuitElement): element is SchematicPortElement {
  return (
    element.type === "schematic_port" &&
    typeof element.schematic_component_id === "string" &&
    typeof element.source_port_id === "string" &&
    isPoint(element.center) &&
    ["left", "right", "top", "bottom"].includes(String(element.side_of_component))
  )
}

function isPoint(candidate: unknown): candidate is Point {
  return (
    typeof candidate === "object" &&
    candidate !== null &&
    "x" in candidate &&
    typeof candidate.x === "number" &&
    "y" in candidate &&
    typeof candidate.y === "number"
  )
}

function isSize(candidate: unknown): candidate is { width: number; height: number } {
  return (
    typeof candidate === "object" &&
    candidate !== null &&
    "width" in candidate &&
    typeof candidate.width === "number" &&
    "height" in candidate &&
    typeof candidate.height === "number"
  )
}
