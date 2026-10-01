import { expect } from "bun:test"
import { resolve } from "node:path"
import type { AnyCircuitElement } from "circuit-json"
import { parsePrebuiltCircuitJson } from "app/parse-prebuilt-circuit-json"
import type { ParameterizedTiEvmId } from "lib/evms/parameterized-ti-evms"
import { getTiEvm } from "lib/ti-evm-catalog"

type CircuitPoint = { x: number; y: number }
type SourceComponentId = string
type SourceNetId = string
type SourcePortId = string
type CircuitSourceComponent = AnyCircuitElement & {
  type: "source_component"
  source_component_id: SourceComponentId
  name: string
}
type CircuitSourcePort = AnyCircuitElement & {
  type: "source_port"
  source_port_id: SourcePortId
  source_component_id?: SourceComponentId
  name: string
  pin_number?: number
  port_hints?: string[]
}
type CircuitSourceTrace = AnyCircuitElement & {
  type: "source_trace"
  source_trace_id: string
  connected_source_port_ids: SourcePortId[]
  connected_source_net_ids: SourceNetId[]
}
type CircuitPcbBoard = AnyCircuitElement & {
  type: "pcb_board"
  center: CircuitPoint
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
  center: CircuitPoint
  layer: string
  rotation: number
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

const repositoryRoot = resolve(import.meta.dir, "../..")

export async function expectReferenceEvmFidelity(params: {
  evmId: ParameterizedTiEvmId
}): Promise<void> {
  const evm = getTiEvm(params.evmId)
  const fullBoardVariant = evm.variants.find(({ id }) => id === "full-board")
  if (!fullBoardVariant) throw new Error(`${evm.name} has no full-board variant`)
  if (!fullBoardVariant.schematicCircuitJsonUrl) {
    throw new Error(`${evm.name} has no full-board schematic artifact`)
  }

  const pcbCircuitJson = await loadPublicCircuitJson(fullBoardVariant.circuitJsonUrl)
  const schematicCircuitJson = await loadPublicCircuitJson(fullBoardVariant.schematicCircuitJsonUrl)
  const sourceCircuitJson = await loadGeneratedSourceCircuitJson(params.evmId)

  expectBoardMatchesSource({ renderedCircuitJson: pcbCircuitJson, sourceCircuitJson })
  expectComponentsMatchSource({ renderedCircuitJson: pcbCircuitJson, sourceCircuitJson })
  expectPadsMatchSource({ renderedCircuitJson: pcbCircuitJson, sourceCircuitJson })
  expectPhysicalConnectivityMatchesSource({
    renderedCircuitJson: pcbCircuitJson,
    sourceCircuitJson,
  })

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

async function loadGeneratedSourceCircuitJson(
  evmId: ParameterizedTiEvmId,
): Promise<AnyCircuitElement[]> {
  const sourcePath = resolve(
    repositoryRoot,
    `lib/generated/ti-evms/${evmId}.source.circuit.json.gz`,
  )
  return parsePrebuiltCircuitJson(new Uint8Array(await Bun.file(sourcePath).arrayBuffer()))
}

function expectBoardMatchesSource(params: {
  renderedCircuitJson: AnyCircuitElement[]
  sourceCircuitJson: AnyCircuitElement[]
}): void {
  const sourceBoard = params.sourceCircuitJson.find(isPcbBoard)
  const renderedBoard = params.renderedCircuitJson.find(isPcbBoard)
  if (!sourceBoard || !renderedBoard) throw new Error("Circuit JSON has no PCB board")
  expect(renderedBoard.center.x).toBeCloseTo(sourceBoard.center.x, 6)
  expect(renderedBoard.center.y).toBeCloseTo(sourceBoard.center.y, 6)
  expect(renderedBoard.width).toBeCloseTo(sourceBoard.width ?? 0, 6)
  expect(renderedBoard.height).toBeCloseTo(sourceBoard.height ?? 0, 6)
  expect(renderedBoard.thickness).toBeCloseTo(sourceBoard.thickness, 6)
  expect(renderedBoard.num_layers).toBe(sourceBoard.num_layers)
  expect(renderedBoard.outline).toEqual(sourceBoard.outline)
}

function expectComponentsMatchSource(params: {
  renderedCircuitJson: AnyCircuitElement[]
  sourceCircuitJson: AnyCircuitElement[]
}): void {
  const sourceComponentsById = new Map<SourceComponentId, CircuitSourceComponent>(
    params.sourceCircuitJson
      .filter(isSourceComponent)
      .map((component) => [component.source_component_id, component]),
  )
  const renderedComponentsById = new Map<SourceComponentId, CircuitSourceComponent>(
    params.renderedCircuitJson
      .filter(isSourceComponent)
      .map((component) => [component.source_component_id, component]),
  )
  const populatedSourceComponentNames = getPopulatedComponentNames({
    circuitJson: params.sourceCircuitJson,
    sourceComponentsById,
  })
  const populatedRenderedComponentNames = getPopulatedComponentNames({
    circuitJson: params.renderedCircuitJson,
    sourceComponentsById: renderedComponentsById,
  })
  expect(
    populatedRenderedComponentNames.filter((componentName) =>
      populatedSourceComponentNames.includes(componentName),
    ),
  ).toEqual(populatedSourceComponentNames)

  const sourcePcbComponentsByName = getPcbComponentsByName({
    circuitJson: params.sourceCircuitJson,
    sourceComponentsById,
  })
  const renderedPcbComponentsByName = getPcbComponentsByName({
    circuitJson: params.renderedCircuitJson,
    sourceComponentsById: renderedComponentsById,
  })
  for (const componentName of populatedSourceComponentNames) {
    const sourceComponent = sourcePcbComponentsByName.get(componentName)
    const renderedComponent = renderedPcbComponentsByName.get(componentName)
    if (!sourceComponent || !renderedComponent) {
      throw new Error(`Missing converted PCB component ${componentName}`)
    }
    expect(renderedComponent.layer).toBe(sourceComponent.layer)
    expect(normalizeRotation(renderedComponent.rotation)).toBeCloseTo(
      normalizeRotation(sourceComponent.rotation),
      6,
    )
  }
}

function getPcbComponentsByName(params: {
  circuitJson: AnyCircuitElement[]
  sourceComponentsById: ReadonlyMap<SourceComponentId, CircuitSourceComponent>
}): Map<string, CircuitPcbComponent> {
  return new Map(
    params.circuitJson.filter(isPcbComponent).flatMap((component) => {
      const componentName = params.sourceComponentsById.get(component.source_component_id)?.name
      return componentName ? [[componentName, component] as const] : []
    }),
  )
}

function normalizeRotation(rotation: number): number {
  return ((rotation % 360) + 360) % 360
}

function getPopulatedComponentNames(params: {
  circuitJson: AnyCircuitElement[]
  sourceComponentsById: ReadonlyMap<SourceComponentId, CircuitSourceComponent>
}): string[] {
  const populatedPcbComponentIds = new Set(
    params.circuitJson.flatMap((element) =>
      isPhysicalPad(element) && element.pcb_component_id ? [element.pcb_component_id] : [],
    ),
  )
  return params.circuitJson
    .filter(isPcbComponent)
    .filter(({ pcb_component_id }) => populatedPcbComponentIds.has(pcb_component_id))
    .flatMap(({ source_component_id }) => {
      const componentName = params.sourceComponentsById.get(source_component_id)?.name
      return componentName ? [componentName] : []
    })
    .sort()
}

function expectPadsMatchSource(params: {
  renderedCircuitJson: AnyCircuitElement[]
  sourceCircuitJson: AnyCircuitElement[]
}): void {
  const sourcePads = params.sourceCircuitJson.filter(isPhysicalPad)
  const renderedPads = params.renderedCircuitJson.filter(isPhysicalPad)
  const sourcePadOwners = getPadOwnerNames(params.sourceCircuitJson)
  const renderedPadOwners = getPadOwnerNames(params.renderedCircuitJson)
  const unmatchedRenderedPads = new Set(renderedPads)
  expect(renderedPads).toHaveLength(sourcePads.length)

  for (const sourcePad of sourcePads) {
    const sourceOwner = sourcePad.pcb_component_id
      ? sourcePadOwners.get(sourcePad.pcb_component_id)
      : undefined
    const renderedPad = [...unmatchedRenderedPads]
      .filter(
        (candidate) =>
          candidate.type === sourcePad.type &&
          (candidate.pcb_component_id
            ? renderedPadOwners.get(candidate.pcb_component_id)
            : undefined) === sourceOwner &&
          getPadShapeFamily(candidate) === getPadShapeFamily(sourcePad) &&
          (sourcePad.type !== "pcb_smtpad" ||
            (candidate.type === "pcb_smtpad" && candidate.layer === sourcePad.layer)),
      )
      .sort(
        (first, second) => getPointDistance(sourcePad, first) - getPointDistance(sourcePad, second),
      )[0]
    if (!renderedPad) throw new Error(`Missing converted ${sourcePad.type}`)
    expect(renderedPad.x).toBeCloseTo(sourcePad.x, 5)
    expect(renderedPad.y).toBeCloseTo(sourcePad.y, 5)
    expectPadGeometryMatches({ renderedPad, sourcePad })
    unmatchedRenderedPads.delete(renderedPad)
  }
  expect(unmatchedRenderedPads.size).toBe(0)
}

function getPadOwnerNames(circuitJson: AnyCircuitElement[]): Map<string, string> {
  const sourceComponentNamesById = new Map(
    circuitJson
      .filter(isSourceComponent)
      .map((component) => [component.source_component_id, component.name] as const),
  )
  return new Map(
    circuitJson.filter(isPcbComponent).flatMap((component) => {
      const componentName = sourceComponentNamesById.get(component.source_component_id)
      return componentName && !/^unnamed_chip\d+$/u.test(componentName)
        ? [[component.pcb_component_id, componentName] as const]
        : []
    }),
  )
}

function getPadShapeFamily(pad: PhysicalPad): string {
  const shape = "shape" in pad ? pad.shape : pad.hole_shape
  if (typeof shape !== "string") throw new Error("Pad has no shape")
  return shape.replace(/^rotated_/u, "")
}

function expectPadGeometryMatches(params: {
  renderedPad: PhysicalPad
  sourcePad: PhysicalPad
}): void {
  const { renderedPad, sourcePad } = params
  if (renderedPad.type !== sourcePad.type) throw new Error("Pad types do not match")
  if (sourcePad.type === "pcb_smtpad" && renderedPad.type === "pcb_smtpad") {
    expectSortedDimensionsMatch({
      renderedDimensions: [renderedPad.width, renderedPad.height],
      sourceDimensions: [sourcePad.width, sourcePad.height],
    })
    if (sourcePad.radius !== undefined) {
      expect(renderedPad.radius).toBeCloseTo(sourcePad.radius, 6)
    }
    expect(renderedPad.layer).toBe(sourcePad.layer)
    return
  }
  if (sourcePad.type === "pcb_hole" && renderedPad.type === "pcb_hole") {
    expect(renderedPad.hole_diameter).toBeCloseTo(sourcePad.hole_diameter ?? 0, 6)
    return
  }
  if (sourcePad.type !== "pcb_plated_hole" || renderedPad.type !== "pcb_plated_hole") {
    throw new Error("Pad types do not match")
  }
  if (sourcePad.hole_diameter !== undefined) {
    expect(renderedPad.hole_diameter).toBeCloseTo(sourcePad.hole_diameter, 6)
  }
  if (sourcePad.outer_diameter !== undefined) {
    expect(renderedPad.outer_diameter).toBeCloseTo(sourcePad.outer_diameter, 6)
  }
  expectSortedDimensionsMatch({
    renderedDimensions: [renderedPad.hole_width, renderedPad.hole_height],
    sourceDimensions: [sourcePad.hole_width, sourcePad.hole_height],
  })
  expectSortedDimensionsMatch({
    renderedDimensions: [renderedPad.outer_width, renderedPad.outer_height],
    sourceDimensions: [sourcePad.outer_width, sourcePad.outer_height],
  })
  expectSortedDimensionsMatch({
    renderedDimensions: [renderedPad.rect_pad_width, renderedPad.rect_pad_height],
    sourceDimensions: [sourcePad.rect_pad_width, sourcePad.rect_pad_height],
  })
}

function expectSortedDimensionsMatch(params: {
  renderedDimensions: Array<number | undefined>
  sourceDimensions: Array<number | undefined>
}): void {
  const sourceDimensions = params.sourceDimensions.filter(
    (dimension): dimension is number => dimension !== undefined,
  )
  if (sourceDimensions.length === 0) return
  const renderedDimensions = params.renderedDimensions.filter(
    (dimension): dimension is number => dimension !== undefined,
  )
  expect(renderedDimensions).toHaveLength(sourceDimensions.length)
  sourceDimensions.sort((first, second) => first - second)
  renderedDimensions.sort((first, second) => first - second)
  for (const [dimensionIndex, sourceDimension] of sourceDimensions.entries()) {
    expect(renderedDimensions[dimensionIndex]).toBeCloseTo(sourceDimension, 6)
  }
}

function expectPhysicalConnectivityMatchesSource(params: {
  renderedCircuitJson: AnyCircuitElement[]
  sourceCircuitJson: AnyCircuitElement[]
}): void {
  expect(createPhysicalNetKeys(params.renderedCircuitJson)).toEqual(
    createPhysicalNetKeys(params.sourceCircuitJson),
  )
}

function createPhysicalNetKeys(circuitJson: AnyCircuitElement[]): string[] {
  const sourceComponentsById = new Map<SourceComponentId, CircuitSourceComponent>(
    circuitJson
      .filter(isSourceComponent)
      .map((component) => [component.source_component_id, component]),
  )
  const sourcePortsById = new Map<SourcePortId, CircuitSourcePort>(
    circuitJson.filter(isSourcePort).map((port) => [port.source_port_id, port]),
  )
  const physicalSourcePortIds = new Set(
    circuitJson.flatMap((element) => (element.type === "pcb_port" ? [element.source_port_id] : [])),
  )
  const endpointKeysByNet = new Map<SourceNetId, Set<string>>()
  for (const sourceTrace of circuitJson.filter(isSourceTrace)) {
    for (const sourceNetId of sourceTrace.connected_source_net_ids) {
      const endpointKeys = endpointKeysByNet.get(sourceNetId) ?? new Set<string>()
      endpointKeysByNet.set(sourceNetId, endpointKeys)
      for (const sourcePortId of sourceTrace.connected_source_port_ids) {
        if (!physicalSourcePortIds.has(sourcePortId)) continue
        const sourcePort = sourcePortsById.get(sourcePortId)
        const sourceComponent = sourcePort?.source_component_id
          ? sourceComponentsById.get(sourcePort.source_component_id)
          : undefined
        if (!sourcePort || !sourceComponent) continue
        endpointKeys.add(`${sourceComponent.name}:${sourcePort.pin_number ?? sourcePort.name}`)
      }
    }
  }
  return [
    ...new Set(
      [...endpointKeysByNet.values()]
        .filter((endpointKeys) => endpointKeys.size >= 2)
        .map((endpointKeys) => [...endpointKeys].sort().join("|")),
    ),
  ].sort()
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
