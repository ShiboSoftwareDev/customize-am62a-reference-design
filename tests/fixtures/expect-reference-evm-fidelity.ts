import { expect } from "bun:test"
import { resolve } from "node:path"
import type { AnyCircuitElement } from "circuit-json"
import { applyToPoint, scale, transform, translate } from "transformation-matrix"
import { parsePrebuiltCircuitJson } from "app/parse-prebuilt-circuit-json"
import {
  getParameterizedTiEvmDefinition,
  type ParameterizedTiEvmId,
} from "lib/evms/parameterized-ti-evms"
import type {
  ReferenceComponent,
  ReferenceEvmDefinition,
  ReferencePad,
} from "lib/evms/reference-evm-types"
import { getTiEvm } from "lib/ti-evm-catalog"

type CircuitPoint = { x: number; y: number }
type CircuitSourceComponent = AnyCircuitElement & {
  type: "source_component"
  source_component_id: string
  name: string
}
type CircuitSourcePort = AnyCircuitElement & {
  type: "source_port"
  source_port_id: string
  source_component_id?: string
  name: string
  pin_number?: number
  port_hints?: string[]
}
type CircuitSourceTrace = AnyCircuitElement & {
  type: "source_trace"
  source_trace_id: string
  connected_source_port_ids: string[]
}
type CircuitPcbBoard = AnyCircuitElement & {
  type: "pcb_board"
  width?: number
  height?: number
  thickness: number
  num_layers: number
  outline?: CircuitPoint[]
}
type CircuitPcbComponent = AnyCircuitElement & {
  type: "pcb_component"
  pcb_component_id: string
  source_component_id: string
}
type CircuitPcbHole = AnyCircuitElement & {
  type: "pcb_hole"
  pcb_component_id?: string
  x: number
  y: number
  hole_shape: string
  hole_diameter?: number
}
type CircuitPcbPlatedHole = AnyCircuitElement & {
  type: "pcb_plated_hole"
  pcb_component_id?: string
  x: number
  y: number
  shape: string
  hole_diameter?: number
  outer_diameter?: number
  hole_width?: number
  hole_height?: number
  outer_width?: number
  outer_height?: number
  rect_pad_width?: number
  rect_pad_height?: number
}
type CircuitPcbSmtPad = AnyCircuitElement & {
  type: "pcb_smtpad"
  pcb_component_id?: string
  x: number
  y: number
  shape: string
  radius?: number
  width?: number
  height?: number
}
type CircuitSchematicComponent = AnyCircuitElement & {
  type: "schematic_component"
  schematic_component_id: string
  source_component_id?: string
}
type CircuitSchematicPort = AnyCircuitElement & {
  type: "schematic_port"
  schematic_port_id: string
  source_port_id: string
  schematic_component_id?: string
}
type CircuitSchematicTrace = AnyCircuitElement & {
  type: "schematic_trace"
  schematic_trace_id: string
  source_trace_id?: string
  edges: Array<{
    from_schematic_port_id?: string
    to_schematic_port_id?: string
  }>
}
type CircuitSchematicNetLabel = AnyCircuitElement & {
  type: "schematic_net_label"
  schematic_trace_id?: string
}
type CircuitSchematicGroup = AnyCircuitElement & {
  type: "schematic_group"
  schematic_component_ids: string[]
}
type PhysicalPad = CircuitPcbHole | CircuitPcbPlatedHole | CircuitPcbSmtPad
type ComponentPhysicalPad = PhysicalPad & { pcb_component_id: string }

const repositoryRoot = resolve(import.meta.dir, "../..")

export async function expectReferenceEvmFidelity(params: {
  evmId: ParameterizedTiEvmId
}): Promise<void> {
  const definition = getParameterizedTiEvmDefinition(params.evmId)
  const evm = getTiEvm(params.evmId)
  const fullBoardVariant = evm.variants.find(({ id }) => id === "full-board")
  if (!fullBoardVariant) throw new Error(`${evm.name} has no full-board variant`)
  if (!fullBoardVariant.schematicCircuitJsonUrl) {
    throw new Error(`${evm.name} has no full-board schematic artifact`)
  }

  const pcbCircuitJson = await loadPublicCircuitJson(fullBoardVariant.circuitJsonUrl)
  const schematicCircuitJson = await loadPublicCircuitJson(fullBoardVariant.schematicCircuitJsonUrl)

  expectBoardGeometry({ definition, pcbCircuitJson })
  expectComponentAndPadGeometry({ definition, pcbCircuitJson })
  expectStandaloneHoleGeometry({ definition, pcbCircuitJson })
  expectSchematicAndPcbNetlistsToMatch({ definition, schematicCircuitJson })

  for (const variant of evm.variants) {
    if (!variant.schematicCircuitJsonUrl) {
      throw new Error(`${evm.name} ${variant.label} has no schematic artifact`)
    }
    const variantPcbCircuitJson = await loadPublicCircuitJson(variant.circuitJsonUrl)
    const variantSchematicCircuitJson = await loadPublicCircuitJson(variant.schematicCircuitJsonUrl)
    expectNoRoutingErrors(variantPcbCircuitJson)
    expectNoDanglingSchematicReferences(variantSchematicCircuitJson)
  }
}

function expectBoardGeometry(params: {
  definition: ReferenceEvmDefinition
  pcbCircuitJson: AnyCircuitElement[]
}): void {
  const board = params.pcbCircuitJson.find(isPcbBoard)
  if (!board) throw new Error("PCB artifact has no board")
  if (board.width === undefined || board.height === undefined || !board.outline) {
    throw new Error("PCB artifact has incomplete board geometry")
  }

  expect(board.width).toBeCloseTo(params.definition.width, 6)
  expect(board.height).toBeCloseTo(params.definition.height, 6)
  expect(board.thickness).toBeCloseTo(params.definition.thickness, 6)
  expect(board.num_layers).toBe(params.definition.layers)
  expect(board.outline).toHaveLength(params.definition.outline.length)
  for (const [pointIndex, point] of params.definition.outline.entries()) {
    expect(board.outline[pointIndex].x).toBeCloseTo(point.x, 6)
    expect(board.outline[pointIndex].y).toBeCloseTo(point.y, 6)
  }
}

function expectComponentAndPadGeometry(params: {
  definition: ReferenceEvmDefinition
  pcbCircuitJson: AnyCircuitElement[]
}): void {
  const sourceComponents = params.pcbCircuitJson.filter(isSourceComponent)
  const pcbComponents = params.pcbCircuitJson.filter(isPcbComponent)
  const physicalPads = params.pcbCircuitJson.filter(isComponentPhysicalPad)

  expect(sourceComponents).toHaveLength(params.definition.components.length)
  for (const referenceComponent of params.definition.components) {
    const sourceComponent = sourceComponents.find(({ name }) => name === referenceComponent.name)
    if (!sourceComponent) throw new Error(`Missing source component ${referenceComponent.name}`)
    const pcbComponent = pcbComponents.find(
      ({ source_component_id }) => source_component_id === sourceComponent.source_component_id,
    )
    if (!pcbComponent) throw new Error(`Missing PCB component ${referenceComponent.name}`)
    const renderedPads = physicalPads.filter(
      ({ pcb_component_id }) => pcb_component_id === pcbComponent.pcb_component_id,
    )
    expect(renderedPads).toHaveLength(referenceComponent.pads.length)
    expectComponentPads({ referenceComponent, renderedPads })
  }
}

function expectComponentPads(params: {
  referenceComponent: ReferenceComponent
  renderedPads: PhysicalPad[]
}): void {
  const componentLocalToBoard = transform(
    translate(params.referenceComponent.x, params.referenceComponent.y),
    scale(params.referenceComponent.layer === "bottom" ? -1 : 1, 1),
  )
  const unmatchedRenderedPads = new Set(params.renderedPads)
  for (const referencePad of params.referenceComponent.pads) {
    const expectedPosition = applyToPoint(componentLocalToBoard, referencePad)
    const renderedPad = [...unmatchedRenderedPads]
      .filter((candidate) => isMatchingPadKind({ referencePad, renderedPad: candidate }))
      .sort(
        (first, second) =>
          getPointDistance(expectedPosition, first) - getPointDistance(expectedPosition, second),
      )[0]
    if (!renderedPad) {
      throw new Error(
        `Missing ${params.referenceComponent.name} pad at ${referencePad.x},${referencePad.y}`,
      )
    }
    expect(renderedPad.x).toBeCloseTo(expectedPosition.x, 6)
    expect(renderedPad.y).toBeCloseTo(expectedPosition.y, 6)
    expectPadDimensions({ referencePad, renderedPad })
    unmatchedRenderedPads.delete(renderedPad)
  }
  expect(unmatchedRenderedPads.size).toBe(0)
}

function isComponentPhysicalPad(element: AnyCircuitElement): element is ComponentPhysicalPad {
  return (
    ["pcb_hole", "pcb_plated_hole", "pcb_smtpad"].includes(element.type) &&
    "pcb_component_id" in element &&
    typeof element.pcb_component_id === "string"
  )
}

function isMatchingPadKind(params: {
  referencePad: ReferencePad
  renderedPad: PhysicalPad
}): boolean {
  if (params.referencePad.kind === "smt") {
    return (
      params.renderedPad.type === "pcb_smtpad" &&
      params.renderedPad.shape === params.referencePad.shape
    )
  }
  if (params.referencePad.kind === "hole") return params.renderedPad.type === "pcb_hole"
  return (
    params.renderedPad.type === "pcb_plated_hole" &&
    params.renderedPad.shape === params.referencePad.shape
  )
}

function expectPadDimensions(params: {
  referencePad: ReferencePad
  renderedPad: PhysicalPad
}): void {
  const { referencePad, renderedPad } = params
  if (referencePad.kind === "smt" && renderedPad.type === "pcb_smtpad") {
    if (referencePad.shape === "circle" && renderedPad.shape === "circle") {
      expect(renderedPad.radius).toBeCloseTo(referencePad.radius ?? 0, 6)
      return
    }
    if ("width" in renderedPad && "height" in renderedPad) {
      expect(renderedPad.width).toBeCloseTo(referencePad.width ?? 0, 6)
      expect(renderedPad.height).toBeCloseTo(referencePad.height ?? 0, 6)
      return
    }
  }
  if (referencePad.kind === "hole" && renderedPad.type === "pcb_hole") {
    if (renderedPad.hole_shape !== "circle") {
      throw new Error("Expected a circular non-plated hole")
    }
    expect(renderedPad.hole_diameter).toBeCloseTo(referencePad.diameter, 6)
    return
  }
  if (referencePad.kind !== "plated_hole" || renderedPad.type !== "pcb_plated_hole") {
    throw new Error("Reference and rendered pad kinds do not match")
  }
  if (referencePad.shape === "circle" && renderedPad.shape === "circle") {
    expect(renderedPad.hole_diameter).toBeCloseTo(referencePad.holeDiameter ?? 0, 6)
    expect(renderedPad.outer_diameter).toBeCloseTo(referencePad.outerDiameter ?? 0, 6)
    return
  }
  if (
    referencePad.shape === "circular_hole_with_rect_pad" &&
    renderedPad.shape === "circular_hole_with_rect_pad"
  ) {
    expect(renderedPad.hole_diameter).toBeCloseTo(referencePad.holeDiameter ?? 0, 6)
    expect(renderedPad.rect_pad_width).toBeCloseTo(referencePad.rectPadWidth ?? 0, 6)
    expect(renderedPad.rect_pad_height).toBeCloseTo(referencePad.rectPadHeight ?? 0, 6)
    return
  }
  if (referencePad.shape === "oval" && renderedPad.shape === "oval") {
    expect(renderedPad.hole_width).toBeCloseTo(referencePad.holeWidth ?? 0, 6)
    expect(renderedPad.hole_height).toBeCloseTo(referencePad.holeHeight ?? 0, 6)
    expect(renderedPad.outer_width).toBeCloseTo(referencePad.outerWidth ?? 0, 6)
    expect(renderedPad.outer_height).toBeCloseTo(referencePad.outerHeight ?? 0, 6)
    return
  }
  throw new Error("Reference and rendered plated-hole shapes do not match")
}

function expectStandaloneHoleGeometry(params: {
  definition: ReferenceEvmDefinition
  pcbCircuitJson: AnyCircuitElement[]
}): void {
  const unmatchedRenderedPads = new Set(
    params.pcbCircuitJson.filter(
      (element): element is PhysicalPad => isPhysicalPad(element) && !element.pcb_component_id,
    ),
  )
  expect(unmatchedRenderedPads.size).toBe(params.definition.standaloneHoles.length)
  for (const referencePad of params.definition.standaloneHoles) {
    const renderedPad = [...unmatchedRenderedPads]
      .filter((candidate) => isMatchingPadKind({ referencePad, renderedPad: candidate }))
      .sort(
        (first, second) =>
          getPointDistance(referencePad, first) - getPointDistance(referencePad, second),
      )[0]
    if (!renderedPad) {
      throw new Error(`Missing standalone pad at ${referencePad.x},${referencePad.y}`)
    }
    expect(renderedPad.x).toBeCloseTo(referencePad.x, 6)
    expect(renderedPad.y).toBeCloseTo(referencePad.y, 6)
    expectPadDimensions({ referencePad, renderedPad })
    unmatchedRenderedPads.delete(renderedPad)
  }
  expect(unmatchedRenderedPads.size).toBe(0)
}

function expectSchematicAndPcbNetlistsToMatch(params: {
  definition: ReferenceEvmDefinition
  schematicCircuitJson: AnyCircuitElement[]
}): void {
  const pcbNetKeys = createPcbNetKeys(params.definition)
  const schematicNetKeys = createSchematicNetKeys({
    definition: params.definition,
    schematicCircuitJson: params.schematicCircuitJson,
  })
  expect(schematicNetKeys).toEqual(pcbNetKeys)
}

function createPcbNetKeys(definition: ReferenceEvmDefinition): string[] {
  return definition.nets
    .map((net) =>
      [
        ...new Set(
          net.endpoints.flatMap((endpoint) => {
            const referenceComponent = definition.components.find(
              ({ name }) => name === endpoint.componentName,
            )
            if (!referenceComponent) throw new Error(`Missing ${endpoint.componentName}`)
            const rawPinName = referenceComponent.pinLabels[endpoint.pinKey]?.[0] ?? endpoint.pinKey
            return expandGroupedPinName(rawPinName).map(
              (pinName) => `${endpoint.componentName}:${pinName}`,
            )
          }),
        ),
      ]
        .sort()
        .join("|"),
    )
    .sort()
}

function createSchematicNetKeys(params: {
  definition: ReferenceEvmDefinition
  schematicCircuitJson: AnyCircuitElement[]
}): string[] {
  const sourceComponents = params.schematicCircuitJson.filter(isSourceComponent)
  const sourcePorts = params.schematicCircuitJson.filter(isSourcePort)
  return params.schematicCircuitJson
    .filter(isSourceTrace)
    .map((sourceTrace) =>
      [
        ...new Set(
          sourceTrace.connected_source_port_ids.flatMap((sourcePortId) => {
            const sourcePort = sourcePorts.find(
              ({ source_port_id }) => source_port_id === sourcePortId,
            )
            const sourceComponent = sourcePort?.source_component_id
              ? sourceComponents.find(
                  ({ source_component_id }) =>
                    source_component_id === sourcePort.source_component_id,
                )
              : undefined
            const componentName = sourceComponent
              ? normalizeCircuitComponentName(sourceComponent.name)
              : undefined
            const referenceComponent = componentName
              ? params.definition.components.find(({ name }) => name === componentName)
              : undefined
            if (!sourcePort || !componentName || !referenceComponent) return []
            const pcbPinLabels = Object.values(referenceComponent.pinLabels).flat()
            const matchingPortHint = (sourcePort.port_hints ?? []).find((portHint) =>
              pcbPinLabels.includes(portHint),
            )
            const rawPinName = String(matchingPortHint ?? sourcePort.pin_number ?? sourcePort.name)
            const hasPcbPin = pcbPinLabels.some(
              (pinLabel) =>
                pinLabel === rawPinName || expandGroupedPinName(pinLabel).includes(rawPinName),
            )
            return hasPcbPin
              ? expandGroupedPinName(rawPinName).map((pinName) => `${componentName}:${pinName}`)
              : []
          }),
        ),
      ]
        .sort()
        .join("|"),
    )
    .filter((netKey) => netKey.split("|").filter(Boolean).length >= 2)
    .sort()
}

function normalizeCircuitComponentName(componentName: string): string {
  const normalizedName = componentName
    .replaceAll(/[^A-Za-z0-9_]+/gu, "_")
    .replaceAll(/^_+|_+$/gu, "")
  if (!normalizedName) return "unnamed"
  return /^[A-Za-z_]/u.test(normalizedName) ? normalizedName : `X_${normalizedName}`
}

function expandGroupedPinName(rawPinName: string): string[] {
  return /^\d+(?:-\d+)+$/u.test(rawPinName) ? rawPinName.split("-") : [rawPinName]
}

function expectNoRoutingErrors(circuitJson: AnyCircuitElement[]): void {
  expect(
    circuitJson.filter(({ type }) =>
      [
        "pcb_trace_error",
        "pcb_port_not_matched_error",
        "source_trace_not_connected_error",
      ].includes(type),
    ),
  ).toEqual([])
}

function expectNoDanglingSchematicReferences(circuitJson: AnyCircuitElement[]): void {
  const sourceComponentIds = new Set(
    circuitJson.filter(isSourceComponent).map(({ source_component_id }) => source_component_id),
  )
  const sourcePortIds = new Set(
    circuitJson.filter(isSourcePort).map(({ source_port_id }) => source_port_id),
  )
  const sourceTraceIds = new Set(
    circuitJson.filter(isSourceTrace).map(({ source_trace_id }) => source_trace_id),
  )
  const schematicComponentIds = new Set(
    circuitJson
      .filter(isSchematicComponent)
      .map(({ schematic_component_id }) => schematic_component_id),
  )
  const schematicPortIds = new Set(
    circuitJson.filter(isSchematicPort).map(({ schematic_port_id }) => schematic_port_id),
  )
  const schematicTraceIds = new Set(
    circuitJson.filter(isSchematicTrace).map(({ schematic_trace_id }) => schematic_trace_id),
  )

  for (const element of circuitJson) {
    if (isSourcePort(element) && element.source_component_id) {
      expect(sourceComponentIds.has(element.source_component_id)).toBe(true)
    }
    if (isSourceTrace(element)) {
      for (const sourcePortId of element.connected_source_port_ids) {
        expect(sourcePortIds.has(sourcePortId)).toBe(true)
      }
    }
    if (isSchematicComponent(element) && element.source_component_id) {
      expect(sourceComponentIds.has(element.source_component_id)).toBe(true)
    }
    if (isSchematicPort(element)) {
      expect(sourcePortIds.has(element.source_port_id)).toBe(true)
      if (element.schematic_component_id) {
        expect(schematicComponentIds.has(element.schematic_component_id)).toBe(true)
      }
    }
    if (isSchematicTrace(element)) {
      if (element.source_trace_id) expect(sourceTraceIds.has(element.source_trace_id)).toBe(true)
      for (const edge of element.edges) {
        if (edge.from_schematic_port_id) {
          expect(schematicPortIds.has(edge.from_schematic_port_id)).toBe(true)
        }
        if (edge.to_schematic_port_id) {
          expect(schematicPortIds.has(edge.to_schematic_port_id)).toBe(true)
        }
      }
    }
    if (isSchematicNetLabel(element) && element.schematic_trace_id) {
      expect(schematicTraceIds.has(element.schematic_trace_id)).toBe(true)
    }
    if (isSchematicGroup(element)) {
      for (const schematicComponentId of element.schematic_component_ids) {
        expect(schematicComponentIds.has(schematicComponentId)).toBe(true)
      }
    }
  }
}

function isPcbBoard(element: AnyCircuitElement): element is CircuitPcbBoard {
  return element.type === "pcb_board"
}

function isPcbComponent(element: AnyCircuitElement): element is CircuitPcbComponent {
  return element.type === "pcb_component"
}

function isPhysicalPad(element: AnyCircuitElement): element is PhysicalPad {
  return ["pcb_hole", "pcb_plated_hole", "pcb_smtpad"].includes(element.type)
}

function isSourceComponent(element: AnyCircuitElement): element is CircuitSourceComponent {
  return element.type === "source_component"
}

function isSourcePort(element: AnyCircuitElement): element is CircuitSourcePort {
  return element.type === "source_port"
}

function isSourceTrace(element: AnyCircuitElement): element is CircuitSourceTrace {
  return element.type === "source_trace"
}

function isSchematicComponent(element: AnyCircuitElement): element is CircuitSchematicComponent {
  return element.type === "schematic_component"
}

function isSchematicPort(element: AnyCircuitElement): element is CircuitSchematicPort {
  return element.type === "schematic_port"
}

function isSchematicTrace(element: AnyCircuitElement): element is CircuitSchematicTrace {
  return element.type === "schematic_trace"
}

function isSchematicNetLabel(element: AnyCircuitElement): element is CircuitSchematicNetLabel {
  return element.type === "schematic_net_label"
}

function isSchematicGroup(element: AnyCircuitElement): element is CircuitSchematicGroup {
  return element.type === "schematic_group"
}

async function loadPublicCircuitJson(publicUrl: string): Promise<AnyCircuitElement[]> {
  const artifactPath = resolve(repositoryRoot, "public", publicUrl.replace(/^\//u, ""))
  const artifactBytes = new Uint8Array(await Bun.file(artifactPath).arrayBuffer())
  return parsePrebuiltCircuitJson(artifactBytes)
}

function getPointDistance(
  first: { x: number; y: number },
  second: { x: number; y: number },
): number {
  return Math.hypot(first.x - second.x, first.y - second.y)
}
