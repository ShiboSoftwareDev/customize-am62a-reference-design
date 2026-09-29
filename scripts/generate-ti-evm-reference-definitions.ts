import { mkdir, readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { convertAltiumToCircuitJson } from "altium-to-circuit-json"
import {
  type AltiumComponentRecord,
  type AltiumPadRecord,
  getAltiumPcbPadGeometry,
  parseAltiumBinaryPcbDoc,
} from "altiumts"
import type { AnyCircuitElement } from "circuit-json"
import { gzipSync, strToU8 } from "fflate"
import type {
  ReferenceComponent,
  ReferenceEvmDefinition,
  ReferenceNet,
  ReferencePad,
  ReferenceSchematicPlacement,
  ReferenceSilkscreen,
} from "../lib/evms/reference-evm-types"

type ReferenceInput = {
  id: string
  exportName: string
  name: string
  sourceUrl: string
  archiveSha256: string
  pcbPath: string
  schematicPaths: string[]
  outputName: string
  getRemovableFeatureId: (name: string) => string | undefined
}

const drvSpeedControlComponents = new Set([
  "U5",
  "R20",
  "D7",
  "D8",
  "C3",
  "C4",
  "C5",
  "R12",
  "R13",
  "R21",
])
const drvHallInterfaceComponents = new Set([
  "U7",
  "U8",
  "U9",
  "U11",
  "R1",
  "R2",
  "R3",
  "R4",
  "R5",
  "R6",
  "R7",
  "R8",
  "R9",
  "R10",
  "C6",
  "C7",
  "C8",
  "C9",
  "C20",
  "JP3",
  "JP5",
  "JP6",
  "JP6a",
  "JP7",
])
const lmgStatusIndicators = new Set([
  "LS_OC",
  "HS_OC",
  "LS_FLT",
  "HS_FLT",
  "HVIN_EN",
  "5V_EN",
  "R1",
  "R5",
  "R29",
  "R30",
])
const lmgMeasurementInterface = new Set([
  "TACH",
  "VAUX",
  "SW",
  "PWM_LS",
  "PWM_HS",
  "PGND5",
  "PGND4",
  "LS_FET_PWM",
  "HVOUT",
  "HVIN",
  "HS_FET_PWM",
  "AGND2",
  "AGND1",
  "ACMGND",
  "12V",
  "5V",
  "J14",
  "J15",
])

const references: ReferenceInput[] = [
  {
    id: "drv8307evm",
    exportName: "drv8307EvmDefinition",
    name: "DRV8307EVM",
    sourceUrl: "https://www.ti.com/tool/DRV8307EVM",
    archiveSha256: "660117e30c1f12473f18d825a8318a5460a13025a7a6223689ac1f9afd3921d8",
    pcbPath: "tmp/references/drv8307/Board files/DRV8307EVM RevA.PcbDoc",
    schematicPaths: ["tmp/references/drv8307/Board files/DRV8307EVM RevA.SchDoc"],
    outputName: "drv8307evm.generated.ts",
    getRemovableFeatureId: (name) => {
      if (drvSpeedControlComponents.has(name)) return "onboard-speed-control"
      if (drvHallInterfaceComponents.has(name)) return "hall-interface"
      return undefined
    },
  },
  {
    id: "lm5155evm-fly",
    exportName: "lm5155EvmFlyDefinition",
    name: "LM5155EVM-FLY",
    sourceUrl: "https://www.ti.com/tool/LM5155EVM-FLY",
    archiveSha256: "e8a1573658d294c6b47c8cdd8833df2d50302ac242afe88ecb8e60ca2f80b215",
    pcbPath: "tmp/references/lm5155fly/BMC029A.PcbDoc",
    schematicPaths: [
      "tmp/references/lm5155fly/BMC029A_SCH.SchDoc",
      "tmp/references/lm5155fly/BMC029A-HW.SchDoc",
    ],
    outputName: "lm5155evm-fly.generated.ts",
    getRemovableFeatureId: (name) => {
      if (/^TP/u.test(name)) return "test-and-measurement"
      if (/^(?:J4|R26)$/u.test(name)) return "configuration-interface"
      return undefined
    },
  },
  {
    id: "lm251772evm-pd",
    exportName: "lm251772EvmPdDefinition",
    name: "LM251772EVM-PD",
    sourceUrl: "https://www.ti.com/tool/LM251772EVM-PD",
    archiveSha256: "d538f1bb6dc0976a1d0509faf0a9f6a7932fc1e80ed3730740272fb390e8516f",
    pcbPath: "tmp/references/lm251772/Altium_Files/SR135B.PcbDoc",
    schematicPaths: ["tmp/references/lm251772/Altium_Files/SR135B.SchDoc"],
    outputName: "lm251772evm-pd.generated.ts",
    getRemovableFeatureId: (name) => {
      if (/^TP/u.test(name)) return "test-and-measurement"
      if (/^(?:SH_)?JP/u.test(name)) return "configuration-jumpers"
      return undefined
    },
  },
  {
    id: "lmg342x-bb-evm",
    exportName: "lmg342xBbEvmDefinition",
    name: "LMG342X-BB-EVM",
    sourceUrl: "https://www.ti.com/tool/LMG342X-BB-EVM",
    archiveSha256: "3aba23eea3b9c4751d55468e8716a2c95277b9cd581edc9ae8ef4fb058717b09",
    pcbPath: "tmp/references/lmg342x/LMG342X_BB_EVM.PcbDoc",
    schematicPaths: ["tmp/references/lmg342x/LMG342X_BB_EVM.SchDoc"],
    outputName: "lmg342x-bb-evm.generated.ts",
    getRemovableFeatureId: (name) => {
      if (lmgStatusIndicators.has(name)) return "status-indicators"
      if (lmgMeasurementInterface.has(name)) return "measurement-interface"
      return undefined
    },
  },
]

const outputDirectory = resolve(import.meta.dir, "../lib/generated/ti-evms")
await mkdir(outputDirectory, { recursive: true })

for (const reference of references) {
  const { definition, referenceSchematicCircuitJson } = await createDefinition(reference)
  const source = [
    'import type { ReferenceEvmDefinition } from "../../evms/reference-evm-types"',
    "",
    "// Generated from the checksum-pinned official TI Altium release.",
    "// Run scripts/generate-ti-evm-reference-definitions.ts to regenerate.",
    `export const ${reference.exportName}: ReferenceEvmDefinition = ${JSON.stringify(definition)}`,
    "",
  ].join("\n")
  await Bun.write(resolve(outputDirectory, reference.outputName), source)
  await Bun.write(
    resolve(outputDirectory, `${reference.id}.schematic.circuit.json.gz`),
    gzipSync(strToU8(JSON.stringify(referenceSchematicCircuitJson)), { level: 9 }),
  )
  console.log(
    `${reference.name}: ${definition.components.length} placed components, ${definition.nets.length} routed nets`,
  )
}

async function createDefinition(reference: ReferenceInput): Promise<{
  definition: ReferenceEvmDefinition
  referenceSchematicCircuitJson: AnyCircuitElement[]
}> {
  const pcbBytes = new Uint8Array(await readFile(reference.pcbPath))
  const pcbDocument = parseAltiumBinaryPcbDoc(pcbBytes)
  const pcbCircuitJson = convertAltiumToCircuitJson(pcbBytes, {
    sourceType: "pcb",
    pcb: {
      includeCopperAreas: false,
      includeCourtyards: false,
      includeDimensions: false,
      includeKeepouts: false,
      includeTraces: false,
      includeVias: false,
    },
  })
  const schematicCircuitJsons = await Promise.all(
    reference.schematicPaths.map(async (schematicPath) => {
      const schematicBytes = new Uint8Array(await readFile(schematicPath))
      return convertAltiumToCircuitJson(schematicBytes, {
        sourceType: "schematic",
        schematic: { sheetName: reference.name },
      })
    }),
  )
  const schematicCircuitJson = schematicCircuitJsons.flat()
  const board = pcbCircuitJson.find(({ type }) => type === "pcb_board")
  if (!board || board.type !== "pcb_board") throw new Error(`${reference.name} has no PCB board`)
  if (![2, 4, 6, 8, 10].includes(board.num_layers)) {
    throw new Error(`${reference.name} has unsupported ${board.num_layers}-layer stack`)
  }

  const componentRecords = pcbDocument.propertyRecords.get("Components6") ?? []
  const padRecords = pcbDocument.primitiveRecords.get("Pads6") ?? []
  const netRecords = pcbDocument.propertyRecords.get("Nets6") ?? []
  const componentElements = new Map(
    pcbCircuitJson
      .filter(({ type }) => type === "pcb_component")
      .map((element) => [getTrailingIndex(element.source_component_id), element]),
  )
  const componentNames = createComponentNames(componentRecords)
  const schematicPlacements = new Map<number, ReferenceSchematicPlacement>()
  for (const sheetCircuitJson of schematicCircuitJsons) {
    for (const [componentIndex, placement] of createSchematicPlacements({
      componentRecords,
      componentNames,
      padRecords,
      schematicCircuitJson: sheetCircuitJson,
    })) {
      if (!schematicPlacements.has(componentIndex)) {
        schematicPlacements.set(componentIndex, placement)
      }
    }
  }
  const sourceComponents = new Map(
    schematicCircuitJson
      .filter(({ type }) => type === "source_component")
      .map((component) => [component.name, component]),
  )

  const components: ReferenceComponent[] = []
  const componentPinKeys = new Map<number, Map<string, string>>()
  for (const [index, componentRecord] of componentRecords.entries()) {
    const componentElement = componentElements.get(index)
    if (!componentElement || componentElement.type !== "pcb_component") continue
    const ownedPadRecords = padRecords.filter(({ componentIndex }) => componentIndex === index)
    if (ownedPadRecords.length === 0) continue
    const pinKeys = createPinKeys(ownedPadRecords)
    componentPinKeys.set(index, pinKeys)
    const pads = removeRedundantContainedPads(
      ownedPadRecords.flatMap((padRecord) => {
        const pinKey = getPinKey(padRecord, pinKeys)
        return [
          createPad({
            padRecord,
            pinKey,
            componentCenter: componentElement.center,
            componentLayer: componentElement.layer === "bottom" ? "bottom" : "top",
          }),
        ]
      }),
    )
    const sourceComponent = sourceComponents.get(componentRecord.designator ?? "")
    const name = componentNames.get(index)
    if (!name) throw new Error(`${reference.name} component ${index} has no generated name`)
    components.push({
      name,
      value:
        (sourceComponent && "display_value" in sourceComponent
          ? sourceComponent.display_value
          : undefined) ??
        componentRecord.sourceLibraryReference ??
        componentRecord.comment ??
        "",
      description: getRecordString(componentRecord, "SOURCEDESCRIPTION"),
      x: round(componentElement.center.x - board.center.x),
      y: round(componentElement.center.y - board.center.y),
      layer: componentElement.layer === "bottom" ? "bottom" : "top",
      pinLabels: Object.fromEntries(
        [...pinKeys.entries()].map(([rawPinName, pinKey]) => [pinKey, [rawPinName]]),
      ),
      pads,
      removableFeatureId: reference.getRemovableFeatureId(componentRecord.designator ?? name),
      schematic: schematicPlacements.get(index),
    })
  }

  const populatedComponentIndexes = new Set(componentPinKeys.keys())
  const nets: ReferenceNet[] = netRecords.flatMap((netRecord, netIndex) => {
    const endpoints = padRecords.flatMap((padRecord) => {
      const componentIndex = padRecord.componentIndex
      if (
        padRecord.netIndex !== netIndex ||
        componentIndex === undefined ||
        componentIndex === 65535 ||
        !populatedComponentIndexes.has(componentIndex)
      ) {
        return []
      }
      const pinKeys = componentPinKeys.get(componentIndex)
      const componentName = componentNames.get(componentIndex)
      const pinKey = pinKeys && getPinKey(padRecord, pinKeys)
      if (!componentName || !pinKey) return []
      return [{ componentName, pinKey }]
    })
    const uniqueEndpoints = [
      ...new Map(
        endpoints.map((endpoint) => [`${endpoint.componentName}:${endpoint.pinKey}`, endpoint]),
      ).values(),
    ]
    if (uniqueEndpoints.length < 2) return []
    return [
      {
        name: `N${netIndex}_${toIdentifier(netRecord.name ?? "unnamed")}`,
        endpoints: uniqueEndpoints,
      },
    ]
  })

  const standaloneHoles = padRecords.flatMap((padRecord) => {
    if (padRecord.componentIndex !== undefined && padRecord.componentIndex !== 65535) return []
    return [
      createPad({
        padRecord,
        componentCenter: board.center,
        componentLayer: "top",
      }),
    ]
  })
  const silkscreen = createSilkscreen({
    pcbCircuitJson,
    boardCenter: board.center,
    boardWidth: board.width,
    boardHeight: board.height,
    componentNames,
    populatedComponentIndexes,
  })

  const definition: ReferenceEvmDefinition = {
    id: reference.id,
    name: reference.name,
    sourceUrl: reference.sourceUrl,
    sourceArchiveSha256: reference.archiveSha256,
    sourcePcbPath: reference.pcbPath.replace(/^tmp\/references\//u, ""),
    sourceSchematicPaths: reference.schematicPaths.map((schematicPath) =>
      schematicPath.replace(/^tmp\/references\//u, ""),
    ),
    outline: board.outline.map(({ x, y }) => ({
      x: round(x - board.center.x),
      y: round(y - board.center.y),
    })),
    width: round(board.width),
    height: round(board.height),
    thickness: round(board.thickness),
    layers: board.num_layers as 2 | 4 | 6 | 8 | 10,
    components,
    nets,
    standaloneHoles,
    silkscreen,
  }
  return {
    definition,
    referenceSchematicCircuitJson: schematicCircuitJsons[0],
  }
}

function createComponentNames(componentRecords: AltiumComponentRecord[]): Map<number, string> {
  const names = new Map<number, string>()
  const usedNames = new Set<string>()
  for (const [index, component] of componentRecords.entries()) {
    const baseName = toIdentifier(component.designator ?? `X${index}`) || `X${index}`
    let name = baseName
    if (usedNames.has(name)) name = `${baseName}_${index}`
    usedNames.add(name)
    names.set(index, name)
  }
  return names
}

function createPinKeys(padRecords: AltiumPadRecord[]): Map<string, string> {
  const pinKeys = new Map<string, string>()
  for (const padRecord of padRecords) {
    const rawPinName = getRawPinName(padRecord)
    if (!rawPinName || pinKeys.has(rawPinName)) continue
    pinKeys.set(rawPinName, `pin${pinKeys.size + 1}`)
  }
  return pinKeys
}

function getRawPinName(padRecord: AltiumPadRecord): string | undefined {
  const name = padRecord.name?.trim()
  if (name && name !== "0") return name
  if (padRecord.netIndex !== undefined && padRecord.netIndex !== 65535) {
    return `pad${padRecord.sourceLocation?.recordIndex ?? "unknown"}`
  }
  return undefined
}

function getPinKey(padRecord: AltiumPadRecord, pinKeys: Map<string, string>): string | undefined {
  const rawPinName = getRawPinName(padRecord)
  return rawPinName ? pinKeys.get(rawPinName) : undefined
}

function createPad(params: {
  padRecord: AltiumPadRecord
  pinKey?: string
  componentCenter: { x: number; y: number }
  componentLayer: "top" | "bottom"
}): ReferencePad {
  const geometry = getAltiumPcbPadGeometry({ record: params.padRecord })
  const padX = geometry.xMils * 0.0254
  const padY = geometry.yMils * 0.0254
  const localX = padX - params.componentCenter.x
  const localY = padY - params.componentCenter.y
  const x = params.componentLayer === "bottom" ? -localX : localX
  const width = geometry.widthMils * 0.0254
  const height = geometry.heightMils * 0.0254
  const holeSize = geometry.holeSizeMils * 0.0254
  const slotLength = geometry.slotLengthMils * 0.0254
  const outputRotation = normalizeRotation(geometry.ccwRotationDegrees)
  const inputRotation =
    params.componentLayer === "bottom" ? normalizeRotation(180 - outputRotation) : outputRotation

  if (params.padRecord.behavior === "through-hole" && !geometry.plated) {
    return {
      kind: "hole",
      x: round(x),
      y: round(localY),
      diameter: round(holeSize),
    }
  }
  if (params.padRecord.behavior === "through-hole") {
    const isCircularPad = geometry.shape === "ROUND" && nearlyEqual(width, height)
    const isCircularHole = geometry.holeShape === "ROUND" && nearlyEqual(holeSize, slotLength)
    if (isCircularPad && isCircularHole) {
      return {
        kind: "plated_hole",
        pinKey: params.pinKey,
        x: round(x),
        y: round(localY),
        shape: "circle",
        holeDiameter: round(holeSize),
        outerDiameter: round(Math.max(width, height)),
      }
    }
    if (geometry.shape === "RECTANGLE" && isCircularHole) {
      return {
        kind: "plated_hole",
        pinKey: params.pinKey,
        x: round(x),
        y: round(localY),
        shape: "circular_hole_with_rect_pad",
        holeDiameter: round(holeSize),
        rectPadWidth: round(width),
        rectPadHeight: round(height),
      }
    }
    return {
      kind: "plated_hole",
      pinKey: params.pinKey,
      x: round(x),
      y: round(localY),
      shape: "oval",
      holeWidth: round(Math.min(holeSize, slotLength)),
      holeHeight: round(Math.max(holeSize, slotLength)),
      outerWidth: round(width),
      outerHeight: round(height),
      pcbRotation: round(inputRotation),
    }
  }
  const isCircle = geometry.shape === "ROUND" && nearlyEqual(width, height)
  const isRounded = geometry.shape === "ROUND" || geometry.shape === "ROUNDEDRECTANGLE"
  const isRotated = !nearlyEqual(inputRotation % 180, 0)
  return {
    kind: "smt",
    pinKey: params.pinKey,
    layer: params.padRecord.layer?.toUpperCase() === "BOTTOM" ? "bottom" : "top",
    x: round(x),
    y: round(localY),
    shape: isCircle
      ? "circle"
      : isRounded
        ? isRotated
          ? "rotated_pill"
          : "pill"
        : isRotated
          ? "rotated_rect"
          : "rect",
    width: isCircle ? undefined : round(width),
    height: isCircle ? undefined : round(height),
    radius: isCircle
      ? round(width / 2)
      : isRounded
        ? round(Math.min(width, height) / 2)
        : undefined,
    ccwRotation: isRotated ? round(inputRotation) : undefined,
  }
}

function removeRedundantContainedPads(pads: ReferencePad[]): ReferencePad[] {
  return pads.filter((pad, padIndex) => {
    if (pad.kind !== "smt" || pad.pinKey === undefined) return true
    const padBounds = getSmtPadBounds(pad)
    return !pads.some((candidate, candidateIndex) => {
      if (
        candidateIndex === padIndex ||
        candidate.kind !== "smt" ||
        candidate.pinKey !== pad.pinKey ||
        candidate.layer !== pad.layer
      ) {
        return false
      }
      const candidateBounds = getSmtPadBounds(candidate)
      const candidateArea =
        (candidateBounds.maxX - candidateBounds.minX) *
        (candidateBounds.maxY - candidateBounds.minY)
      const padArea = (padBounds.maxX - padBounds.minX) * (padBounds.maxY - padBounds.minY)
      if (candidateArea <= padArea) return false
      return (
        candidateBounds.minX <= padBounds.minX &&
        candidateBounds.maxX >= padBounds.maxX &&
        candidateBounds.minY <= padBounds.minY &&
        candidateBounds.maxY >= padBounds.maxY
      )
    })
  })
}

function getSmtPadBounds(pad: Extract<ReferencePad, { kind: "smt" }>): {
  minX: number
  maxX: number
  minY: number
  maxY: number
} {
  const diameter = (pad.radius ?? 0) * 2
  let width = pad.width ?? diameter
  let height = pad.height ?? diameter
  const rotation = normalizeRotation(pad.ccwRotation ?? 0)
  if (nearlyEqual(rotation % 180, 90)) [width, height] = [height, width]
  return {
    minX: pad.x - width / 2,
    maxX: pad.x + width / 2,
    minY: pad.y - height / 2,
    maxY: pad.y + height / 2,
  }
}

function createSchematicPlacements(params: {
  componentRecords: AltiumComponentRecord[]
  componentNames: Map<number, string>
  padRecords: AltiumPadRecord[]
  schematicCircuitJson: AnyCircuitElement[]
}): Map<number, ReferenceSchematicPlacement> {
  const placements = new Map<number, ReferenceSchematicPlacement>()
  const sourcePorts = new Map(
    params.schematicCircuitJson
      .filter(({ type }) => type === "source_port")
      .map((port) => [port.source_port_id, port]),
  )
  const schematicPortsByComponent = Map.groupBy(
    params.schematicCircuitJson.filter(({ type }) => type === "schematic_port"),
    ({ schematic_component_id }) => schematic_component_id,
  )
  const schematicComponentsBySource = Map.groupBy(
    params.schematicCircuitJson.filter(({ type }) => type === "schematic_component"),
    ({ source_component_id }) => source_component_id,
  )

  for (const [index] of params.componentRecords.entries()) {
    const sourceComponent = params.schematicCircuitJson.find(
      (element) =>
        element.type === "source_component" &&
        element.name === params.componentRecords[index].designator,
    )
    if (!sourceComponent || sourceComponent.type !== "source_component") continue
    const schematicComponents = schematicComponentsBySource.get(sourceComponent.source_component_id)
    if (!schematicComponents || schematicComponents.length === 0) continue
    const schematicComponent = schematicComponents[0]
    const componentPads = params.padRecords.filter(({ componentIndex }) => componentIndex === index)
    const pinKeys = createPinKeys(componentPads)
    const sides = {
      left: [] as Array<{ pinKey: string; x: number; y: number }>,
      right: [] as Array<{ pinKey: string; x: number; y: number }>,
      top: [] as Array<{ pinKey: string; x: number; y: number }>,
      bottom: [] as Array<{ pinKey: string; x: number; y: number }>,
    }
    const assignedPins = new Set<string>()
    for (const schematicPort of schematicPortsByComponent.get(
      schematicComponent.schematic_component_id,
    ) ?? []) {
      const sourcePort = sourcePorts.get(schematicPort.source_port_id)
      if (!sourcePort) continue
      const rawPinName = String(sourcePort.pin_number ?? sourcePort.name)
      const pinKey = pinKeys.get(rawPinName)
      if (!pinKey || assignedPins.has(pinKey)) continue
      const side = schematicPort.side_of_component
      sides[side].push({ pinKey, x: schematicPort.center.x, y: schematicPort.center.y })
      assignedPins.add(pinKey)
    }
    const unassignedPins = [...pinKeys.values()].filter((pinKey) => !assignedPins.has(pinKey))
    for (const [pinIndex, pinKey] of unassignedPins.entries()) {
      sides[pinIndex % 2 === 0 ? "left" : "right"].push({ pinKey, x: 0, y: -pinIndex })
    }
    sides.left.sort((a, b) => b.y - a.y)
    sides.right.sort((a, b) => b.y - a.y)
    sides.top.sort((a, b) => a.x - b.x)
    sides.bottom.sort((a, b) => a.x - b.x)
    placements.set(index, {
      x: round(schematicComponent.center.x),
      y: round(schematicComponent.center.y),
      width: round(Math.max(1.2, schematicComponent.size.width)),
      height: round(Math.max(0.8, schematicComponent.size.height)),
      leftPins: sides.left.map(({ pinKey }) => pinKey),
      rightPins: sides.right.map(({ pinKey }) => pinKey),
      topPins: sides.top.map(({ pinKey }) => pinKey),
      bottomPins: sides.bottom.map(({ pinKey }) => pinKey),
    })
  }
  return placements
}

function createSilkscreen(params: {
  pcbCircuitJson: AnyCircuitElement[]
  boardCenter: { x: number; y: number }
  boardWidth: number
  boardHeight: number
  componentNames: Map<number, string>
  populatedComponentIndexes: Set<number>
}): ReferenceSilkscreen[] {
  return params.pcbCircuitJson
    .flatMap((element) => {
      const ownerComponentName =
        "pcb_component_id" in element && typeof element.pcb_component_id === "string"
          ? getOwnerComponentName(
              element.pcb_component_id,
              params.componentNames,
              params.populatedComponentIndexes,
            )
          : undefined
      if (element.type === "pcb_silkscreen_line") {
        return [
          {
            kind: "line" as const,
            ownerComponentName,
            layer: element.layer === "bottom" ? "bottom" : "top",
            strokeWidth: round(Math.max(0.05, element.stroke_width)),
            route: [
              {
                x: round(element.x1 - params.boardCenter.x),
                y: round(element.y1 - params.boardCenter.y),
              },
              {
                x: round(element.x2 - params.boardCenter.x),
                y: round(element.y2 - params.boardCenter.y),
              },
            ],
          },
        ]
      }
      if (element.type === "pcb_silkscreen_path") {
        return [
          {
            kind: "line" as const,
            ownerComponentName,
            layer: element.layer === "bottom" ? "bottom" : "top",
            strokeWidth: round(Math.max(0.05, element.stroke_width)),
            route: element.route.map(({ x, y }) => ({
              x: round(x - params.boardCenter.x),
              y: round(y - params.boardCenter.y),
            })),
          },
        ]
      }
      if (element.type === "pcb_silkscreen_rect") {
        const halfWidth = element.width / 2
        const halfHeight = element.height / 2
        const x = element.center.x - params.boardCenter.x
        const y = element.center.y - params.boardCenter.y
        return [
          {
            kind: "line" as const,
            ownerComponentName,
            layer: element.layer === "bottom" ? "bottom" : "top",
            strokeWidth: round(Math.max(0.05, element.stroke_width)),
            route: [
              { x: round(x - halfWidth), y: round(y - halfHeight) },
              { x: round(x + halfWidth), y: round(y - halfHeight) },
              { x: round(x + halfWidth), y: round(y + halfHeight) },
              { x: round(x - halfWidth), y: round(y + halfHeight) },
              { x: round(x - halfWidth), y: round(y - halfHeight) },
            ],
          },
        ]
      }
      if (
        element.type === "pcb_silkscreen_text" &&
        element.text.trim() &&
        !isUnresolvedAltiumText(element.text)
      ) {
        return [
          {
            kind: "text" as const,
            ownerComponentName,
            layer: element.layer === "bottom" ? "bottom" : "top",
            text: element.text,
            x: round(element.anchor_position.x - params.boardCenter.x),
            y: round(element.anchor_position.y - params.boardCenter.y),
            fontSize: round(Math.max(0.6, element.font_size)),
            rotation: round(element.ccw_rotation),
          },
        ]
      }
      if (element.type === "pcb_silkscreen_graphic" && element.shape === "brep") {
        return [
          {
            kind: "line" as const,
            ownerComponentName,
            layer: element.layer === "bottom" ? "bottom" : "top",
            strokeWidth: 0.08,
            route: element.brep_shape.outer_ring.vertices.map(({ x, y }) => ({
              x: round(x - params.boardCenter.x),
              y: round(y - params.boardCenter.y),
            })),
          },
        ]
      }
      return []
    })
    .filter((silkscreen) => isSilkscreenOnBoard(silkscreen, params))
}

function isUnresolvedAltiumText(text: string): boolean {
  return /(?:\.PRJ_|Layer_Name)/iu.test(text)
}

function isSilkscreenOnBoard(
  silkscreen: ReferenceSilkscreen,
  board: { boardWidth: number; boardHeight: number },
): boolean {
  const margin = 0.5
  const isOnBoard = ({ x, y }: { x: number; y: number }) =>
    Math.abs(x) <= board.boardWidth / 2 + margin && Math.abs(y) <= board.boardHeight / 2 + margin
  if (silkscreen.kind === "text") return isOnBoard(silkscreen)
  return silkscreen.route.every(isOnBoard)
}

function getOwnerComponentName(
  pcbComponentId: string,
  componentNames: Map<number, string>,
  populatedComponentIndexes: Set<number>,
): string | undefined {
  const componentIndex = getTrailingIndex(pcbComponentId)
  if (!populatedComponentIndexes.has(componentIndex)) return undefined
  return componentNames.get(componentIndex)
}

function getTrailingIndex(id: string): number {
  const match = id.match(/_(\d+)$/u)
  if (!match) throw new Error(`Expected trailing record index in ${id}`)
  return Number(match[1])
}

function toIdentifier(value: string): string {
  const normalized = value.replaceAll(/[^A-Za-z0-9_]+/gu, "_").replaceAll(/^_+|_+$/gu, "")
  if (!normalized) return "unnamed"
  return /^[A-Za-z_]/u.test(normalized) ? normalized : `X_${normalized}`
}

function normalizeRotation(rotation: number): number {
  return ((rotation % 360) + 360) % 360
}

function nearlyEqual(first: number, second: number): boolean {
  return Math.abs(first - second) < 0.000001
}

function getRecordString(record: AltiumComponentRecord, key: string): string {
  const value = record.get(key)
  return typeof value === "string" ? value : ""
}

function round(value: number): number {
  return Number(value.toFixed(6))
}
