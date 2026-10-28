import {
  CopperPourPipelineSolver,
  convertCircuitJsonToInputProblem,
  initializeManifoldGeometry,
} from "@tscircuit/copper-pour-solver"
import type { InputPad } from "@tscircuit/copper-pour-solver"
import type { AnyCircuitElement } from "circuit-json"
import type { RecomputedCopperPourDefinition } from "./recomputed-copper-pour-config"

type CircuitPoint = { x: number; y: number }

type PcbBoardElement = AnyCircuitElement & {
  outline: CircuitPoint[]
  type: "pcb_board"
}

type PcbCopperPourElement = AnyCircuitElement & {
  layer: string
  pcb_copper_pour_id: string
  source_net_id?: string
  type: "pcb_copper_pour"
}

type SourceNetElement = AnyCircuitElement & {
  name: string
  source_net_id: string
  subcircuit_connectivity_map_key?: string
  subcircuit_id?: string
  type: "source_net"
}

export type RecomputedCopperPourResult = {
  circuitJson: AnyCircuitElement[]
  generatedPourCount: number
  preservedPourCount: number
}

export async function recomputeCopperPours(params: {
  circuitJson: AnyCircuitElement[]
  definitions: readonly RecomputedCopperPourDefinition[]
}): Promise<RecomputedCopperPourResult> {
  if (params.definitions.length === 0) {
    return {
      circuitJson: params.circuitJson,
      generatedPourCount: 0,
      preservedPourCount: 0,
    }
  }

  const board = params.circuitJson.find(
    (element): element is PcbBoardElement =>
      element.type === "pcb_board" && Array.isArray(element.outline),
  )
  if (!board?.outline) throw new Error("Cannot recompute copper pours without a board outline")

  const resolvedDefinitions = params.definitions.map((definition) => ({
    definition,
    sourceNet: getSourceNet({
      circuitJson: params.circuitJson,
      sourceNetName: definition.sourceNetName,
    }),
  }))
  const preservedPours = params.circuitJson.filter((element) =>
    resolvedDefinitions.some(
      ({ definition, sourceNet }) =>
        element.type === "pcb_copper_pour" &&
        element.layer === definition.layer &&
        element.source_net_id === sourceNet.source_net_id,
    ),
  )
  const circuitJsonWithoutTargetPours = params.circuitJson.filter(
    (element) => !preservedPours.includes(element),
  )

  await initializeManifoldGeometry()
  const inputProblem = convertCircuitJsonToInputProblem(
    circuitJsonWithoutTargetPours,
    resolvedDefinitions.map(({ definition, sourceNet }) => ({
      layer: definition.layer,
      source_net_id: sourceNet.source_net_id,
      subcircuit_id: sourceNet.subcircuit_id,
      pad_margin: 0.2,
      trace_margin: 0.2,
      pour_margin: 0.2,
      board_edge_margin: 0.3,
      cutout_margin: 0.2,
      use_thermal_reliefs: true,
      thermal_relief_spoke_width: 0.3,
      thermal_relief_spoke_count: 4,
      outline: board.outline,
    })),
  )
  inputProblem.pads.push(
    ...getPreservedCopperPourObstacles({
      circuitJson: circuitJsonWithoutTargetPours,
      definitions: params.definitions,
    }),
  )
  const output = new CopperPourPipelineSolver(inputProblem).getOutput()
  const generatedPours = resolvedDefinitions.flatMap(({ definition, sourceNet }, definitionIndex) =>
    output.brep_shapes_by_region[definitionIndex]!.map(
      (brepShape, shapeIndex): PcbCopperPourElement => ({
        type: "pcb_copper_pour",
        shape: "brep",
        pcb_copper_pour_id: `pcb_copper_pour_recomputed_${definition.layer}_${shapeIndex}`,
        layer: definition.layer,
        source_net_id: sourceNet.source_net_id,
        subcircuit_id: sourceNet.subcircuit_id,
        brep_shape: {
          outer_ring: brepShape.outer_ring,
          inner_rings: brepShape.inner_rings,
        },
        covered_with_solder_mask: true,
      }),
    ),
  )

  return {
    circuitJson: [...params.circuitJson, ...generatedPours],
    generatedPourCount: generatedPours.length,
    preservedPourCount: preservedPours.length,
  }
}

function getPreservedCopperPourObstacles(params: {
  circuitJson: AnyCircuitElement[]
  definitions: readonly RecomputedCopperPourDefinition[]
}): InputPad[] {
  return params.circuitJson.flatMap<InputPad>((element): InputPad[] => {
    if (
      element.type !== "pcb_copper_pour" ||
      !params.definitions.some(({ layer }) => layer === element.layer) ||
      typeof element.pcb_copper_pour_id !== "string"
    ) {
      return []
    }

    const baseObstacle = {
      padId: `preserved-copper-pour:${element.pcb_copper_pour_id}`,
      layer: element.layer as string,
      connectivityKey: getCopperPourConnectivityKey({
        circuitJson: params.circuitJson,
        copperPour: element,
      }),
    }

    if (element.shape === "polygon" && isCircuitPointArray(element.points)) {
      return [{ ...baseObstacle, shape: "polygon" as const, points: element.points }]
    }
    if (
      element.shape === "rect" &&
      isCircuitPoint(element.center) &&
      typeof element.width === "number" &&
      typeof element.height === "number"
    ) {
      return [
        {
          ...baseObstacle,
          shape: "rect" as const,
          bounds: {
            minX: element.center.x - element.width / 2,
            minY: element.center.y - element.height / 2,
            maxX: element.center.x + element.width / 2,
            maxY: element.center.y + element.height / 2,
          },
        },
      ]
    }
    if (
      element.shape === "brep" &&
      typeof element.brep_shape === "object" &&
      element.brep_shape !== null &&
      "outer_ring" in element.brep_shape &&
      isCircuitPointArray(element.brep_shape.outer_ring)
    ) {
      return [
        {
          ...baseObstacle,
          shape: "polygon" as const,
          points: element.brep_shape.outer_ring,
        },
      ]
    }
    throw new Error(`Unsupported preserved copper pour: ${element.pcb_copper_pour_id}`)
  })
}

function getCopperPourConnectivityKey(params: {
  circuitJson: AnyCircuitElement[]
  copperPour: AnyCircuitElement
}): string {
  const sourceNet = params.circuitJson.find(
    (element): element is SourceNetElement =>
      element.type === "source_net" && element.source_net_id === params.copperPour.source_net_id,
  )
  return (
    sourceNet?.subcircuit_connectivity_map_key ??
    `unconnected-copper-pour:${params.copperPour.pcb_copper_pour_id}`
  )
}

function isCircuitPoint(value: unknown): value is CircuitPoint {
  return (
    typeof value === "object" &&
    value !== null &&
    "x" in value &&
    typeof value.x === "number" &&
    "y" in value &&
    typeof value.y === "number"
  )
}

function isCircuitPointArray(value: unknown): value is CircuitPoint[] {
  return Array.isArray(value) && value.every(isCircuitPoint)
}

function getSourceNet(params: {
  circuitJson: AnyCircuitElement[]
  sourceNetName: string
}): SourceNetElement {
  const sourceNet = params.circuitJson.find(
    (element): element is SourceNetElement =>
      element.type === "source_net" && element.name === params.sourceNetName,
  )
  if (!sourceNet?.subcircuit_connectivity_map_key) {
    throw new Error(`Cannot recompute copper pour for missing net: ${params.sourceNetName}`)
  }
  return sourceNet
}

export function isRecomputedCopperPour(
  element: AnyCircuitElement,
): element is PcbCopperPourElement {
  return (
    element.type === "pcb_copper_pour" &&
    typeof element.pcb_copper_pour_id === "string" &&
    element.pcb_copper_pour_id.startsWith("pcb_copper_pour_recomputed_")
  )
}
