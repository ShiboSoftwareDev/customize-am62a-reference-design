import { readFile } from "node:fs/promises"
import { basename } from "node:path"
import {
  convertAltiumProjectToCircuitJson,
  convertAltiumToCircuitJson,
  parseAltiumSource,
} from "altium-to-circuit-json"
import {
  AltiumComponentRecord,
  AltiumNetRecord,
  AltiumPadRecord,
  AltiumPrjPcb,
  type AltiumSchDoc,
  parseAltiumBinaryPcbDoc,
  parseAltiumFile,
} from "altiumts"
import type { AnyCircuitElement } from "circuit-json"
import type {
  ReferenceComponent,
  ReferenceNet,
  ReferenceSchematicPlacement,
} from "../../lib/evms/reference-evm-types"
import { applyAllegroPadNetAssignments } from "./apply-allegro-pad-net-assignments"
import {
  isPcbBoard,
  isPcbComponent,
  isSourceComponent,
  type SourceComponentElement,
} from "./circuit-json-elements"
import { getTrailingIndex, round, toIdentifier } from "./geometry"
import {
  createComponentNames,
  createPad,
  createPinKeys,
  getPinKey,
  removeRedundantContainedPads,
} from "./pads"
import { createSchematicPlacements } from "./schematic-placements"
import { createSilkscreen } from "./silkscreen"
import { getTeardropsByNet } from "./teardrops"
import type {
  ComponentName,
  ComponentRecordIndex,
  EmbeddedModelIndex,
  NetRecordIndex,
  PinKeysByComponentRecordIndex,
  ReferenceConversion,
  ReferenceInput,
  SourceFootprintByComponentName,
} from "./types"

type EndpointKey = string

export async function createReferenceDefinition(
  reference: ReferenceInput,
): Promise<ReferenceConversion> {
  const pcbBytes = new Uint8Array(await readFile(reference.pcbPath))
  const pcbDocument = parseAltiumBinaryPcbDoc(pcbBytes)
  const parsedProject = parseAltiumFile(
    new Uint8Array(await readFile(reference.projectPath)),
  ).document
  if (!(parsedProject instanceof AltiumPrjPcb)) {
    throw new Error(`${reference.name} project file is not an Altium PCB project`)
  }
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
  const componentRecords = (pcbDocument.propertyRecords.get("Components6") ?? []).filter(
    (record): record is AltiumComponentRecord => record instanceof AltiumComponentRecord,
  )
  const padRecords = (pcbDocument.primitiveRecords.get("Pads6") ?? []).filter(
    (record): record is AltiumPadRecord => record instanceof AltiumPadRecord,
  )
  const hasNativePcbConnectivity = hasConnectedPcbPads(padRecords)
  const componentNames = createComponentNames({
    componentRecords,
    document: pcbDocument,
  })
  if (reference.sourcePcbConnectivityPath) {
    const assignedPadCount = applyAllegroPadNetAssignments({
      allegroAsciiExport: await readFile(reference.sourcePcbConnectivityPath, "utf8"),
      componentNames,
      pcbDocument,
    })
    console.log(
      `${reference.name}: restored ${assignedPadCount} pad net assignments from the official connectivity source`,
    )
  }
  const padRecordsByComponentIndex = new Map<ComponentRecordIndex, AltiumPadRecord[]>()
  for (const padRecord of padRecords) {
    const componentIndex = padRecord.componentIndex
    if (componentIndex === undefined) continue
    const componentPads = padRecordsByComponentIndex.get(componentIndex) ?? []
    componentPads.push(padRecord)
    padRecordsByComponentIndex.set(componentIndex, componentPads)
  }
  const schematicSources: Array<{
    bytes: Uint8Array
    document: AltiumSchDoc
    path: string
  }> = []
  for (const schematicPath of reference.schematicPaths) {
    const schematicBytes = new Uint8Array(await readFile(schematicPath))
    schematicSources.push({
      bytes: schematicBytes,
      document: parseAltiumSource(schematicBytes, "schematic") as AltiumSchDoc,
      path: schematicPath,
    })
  }
  const referencedEmbeddedModelIndexes = new Set<EmbeddedModelIndex>()
  const projectCircuitJson = convertAltiumProjectToCircuitJson({
    pcb: {
      document: pcbDocument,
      options: {
        includeCopperAreas: true,
        includeTraces: true,
        includeVias: true,
        project: parsedProject,
        resolveEmbeddedModelUrl: ({ embeddedModel }) => {
          referencedEmbeddedModelIndexes.add(embeddedModel.index)
          return `/cad-models/ti-evms/${reference.id}/${embeddedModel.index}.step`
        },
      },
    },
    schematics: hasNativePcbConnectivity
      ? []
      : schematicSources.map((schematicSource) => ({
          document: schematicSource.document,
          options: getSchematicConversionOptions({
            parsedProject,
            projectPath: reference.projectPath,
            referenceName: reference.name,
            schematicPath: schematicSource.path,
          }),
        })),
  }).filter((element) => !element.type.startsWith("schematic_"))
  console.log(`${reference.name}: converted PCB source`)
  const schematicCircuitJsons = schematicSources.map((schematicSource) =>
    convertAltiumToCircuitJson(schematicSource.bytes, {
      sourceType: "schematic",
      schematic: getSchematicConversionOptions({
        parsedProject,
        projectPath: reference.projectPath,
        referenceName: reference.name,
        schematicPath: schematicSource.path,
      }),
    }),
  )
  const schematicCircuitJson = schematicCircuitJsons.flat()
  console.log(`${reference.name}: converted ${schematicCircuitJsons.length} schematic sheets`)
  const board = pcbCircuitJson.find(isPcbBoard)
  if (!board) {
    throw new Error(`${reference.name} has no PCB board`)
  }
  if (![2, 4, 6, 8, 10].includes(board.num_layers)) {
    throw new Error(`${reference.name} has unsupported ${board.num_layers}-layer stack`)
  }

  const netRecords = (pcbDocument.propertyRecords.get("Nets6") ?? []).filter(
    (record): record is AltiumNetRecord => record instanceof AltiumNetRecord,
  )
  const padRecordsByNetIndex = new Map<NetRecordIndex, AltiumPadRecord[]>()
  for (const padRecord of padRecords) {
    const netIndex = padRecord.netIndex
    if (netIndex !== undefined) {
      const netPads = padRecordsByNetIndex.get(netIndex) ?? []
      netPads.push(padRecord)
      padRecordsByNetIndex.set(netIndex, netPads)
    }
  }
  const componentElements = new Map(
    pcbCircuitJson
      .filter(isPcbComponent)
      .map((element) => [getTrailingIndex(element.source_component_id), element]),
  )
  const schematicPlacements = new Map<ComponentRecordIndex, ReferenceSchematicPlacement>()
  for (const sheetCircuitJson of schematicCircuitJsons) {
    for (const [componentIndex, placement] of createSchematicPlacements({
      componentNames,
      componentRecords,
      padRecordsByComponentIndex,
      schematicCircuitJson: sheetCircuitJson,
    })) {
      if (!schematicPlacements.has(componentIndex)) {
        schematicPlacements.set(componentIndex, placement)
      }
    }
  }
  console.log(`${reference.name}: mapped schematic placements`)
  const sourceComponents = new Map<ComponentName, SourceComponentElement>(
    schematicCircuitJson.filter(isSourceComponent).map((component) => [component.name, component]),
  )
  const schematicSheetIndexesByComponentName =
    getSchematicSheetIndexesByComponentName(schematicCircuitJsons)

  const components: ReferenceComponent[] = []
  const componentPinKeys: PinKeysByComponentRecordIndex = new Map()
  const sourceFootprintByComponentName: SourceFootprintByComponentName = new Map()
  for (const [componentIndex, componentRecord] of componentRecords.entries()) {
    const componentElement = componentElements.get(componentIndex)
    if (componentElement?.type !== "pcb_component") continue
    const ownedPadRecords = padRecordsByComponentIndex.get(componentIndex) ?? []
    if (ownedPadRecords.length === 0) continue
    const pinKeys = createPinKeys(ownedPadRecords)
    componentPinKeys.set(componentIndex, pinKeys)
    const pads = removeRedundantContainedPads(
      ownedPadRecords.map((padRecord) =>
        createPad({
          padRecord,
          pinKey: getPinKey({ padRecord, pinKeys }),
          componentCenter: componentElement.center,
          componentLayer: componentElement.layer === "bottom" ? "bottom" : "top",
        }),
      ),
    )
    const componentName = componentNames.get(componentIndex)
    if (!componentName) {
      throw new Error(`${reference.name} component ${componentIndex} has no generated name`)
    }
    if (componentRecord.footprint) {
      sourceFootprintByComponentName.set(componentName, componentRecord.footprint)
    }
    const sourceComponent = sourceComponents.get(componentName)
    const schematicName = componentRecord.designator ?? componentName
    components.push({
      name: componentName,
      schematicName: schematicName === componentName ? undefined : schematicName,
      value:
        (sourceComponent && "display_value" in sourceComponent
          ? sourceComponent.display_value
          : undefined) ??
        componentRecord.sourceLibraryReference ??
        componentRecord.comment ??
        "",
      description: getRecordString({ record: componentRecord, key: "SOURCEDESCRIPTION" }),
      x: round(componentElement.center.x - board.center.x),
      y: round(componentElement.center.y - board.center.y),
      layer: componentElement.layer === "bottom" ? "bottom" : "top",
      pinLabels: Object.fromEntries(
        [...pinKeys.entries()].map(([rawPinName, pinKey]) => [pinKey, [rawPinName]]),
      ),
      pads,
      removableFeatureId: getRemovableFeatureId({
        componentName: schematicName,
        reference,
        schematicSheetIndexesByComponentName,
      }),
      schematic: schematicPlacements.get(componentIndex),
    })
  }
  console.log(`${reference.name}: mapped ${components.length} PCB components`)

  const populatedComponentIndexes = new Set<ComponentRecordIndex>(componentPinKeys.keys())
  const teardropsByNet = getTeardropsByNet({
    pcbDocument,
    padRecords,
    componentNames,
    componentPinKeys,
  })
  const nets: ReferenceNet[] = netRecords.flatMap((netRecord, netIndex) => {
    const endpoints = (padRecordsByNetIndex.get(netIndex) ?? []).flatMap((padRecord) => {
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
      const pinKey = pinKeys && getPinKey({ padRecord, pinKeys })
      return componentName && pinKey ? [{ componentName, pinKey }] : []
    })
    const uniqueEndpoints = [
      ...new Map<EndpointKey, (typeof endpoints)[number]>(
        endpoints.map((endpoint) => [`${endpoint.componentName}:${endpoint.pinKey}`, endpoint]),
      ).values(),
    ]
    if (uniqueEndpoints.length < 2) return []
    const teardrops = teardropsByNet.get(netIndex)
    return [
      {
        name: `N${netIndex}_${toIdentifier(netRecord.name ?? "unnamed")}`,
        endpoints: uniqueEndpoints,
        teardropEndpoints:
          teardrops && teardrops.endpointKeys.size > 0
            ? uniqueEndpoints.filter(({ componentName, pinKey }) =>
                teardrops.endpointKeys.has(`${componentName}.${pinKey}`),
              )
            : undefined,
        hasViaTeardrops: teardrops?.hasViaTeardrops || undefined,
      },
    ]
  })
  console.log(`${reference.name}: mapped ${nets.length} connected nets`)

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
  console.log(`${reference.name}: mapped silkscreen`)

  const embeddedCadModels = await Promise.all(
    pcbDocument.embeddedModels.flatMap((embeddedModel) =>
      referencedEmbeddedModelIndexes.has(embeddedModel.index)
        ? [
            embeddedModel.getDecompressedBytes().then((bytes) => ({
              bytes,
              modelIndex: embeddedModel.index,
            })),
          ]
        : [],
    ),
  )

  return {
    pcbDocument,
    definition: {
      id: reference.id,
      name: reference.name,
      sourceUrl: reference.sourceUrl,
      sourceArchiveSha256: reference.archiveSha256,
      sourceConnectivityArchiveSha256: reference.sourceConnectivityArchiveSha256,
      sourcePcbConnectivityPath: reference.sourcePcbConnectivityPath?.replace(
        /^tmp\/references\//u,
        "",
      ),
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
    },
    embeddedCadModels,
    projectCircuitJson,
    referenceSchematicCircuitJsons: schematicCircuitJsons,
    sourceFootprintByComponentName,
  }
}

function hasConnectedPcbPads(padRecords: AltiumPadRecord[]): boolean {
  return padRecords.some(
    (padRecord) => padRecord.netIndex !== undefined && padRecord.netIndex !== 65535,
  )
}

function getSchematicConversionOptions(params: {
  parsedProject: AltiumPrjPcb
  projectPath: string
  referenceName: string
  schematicPath: string
}) {
  return {
    documentName: basename(params.schematicPath),
    project: params.parsedProject,
    projectName: basename(params.projectPath),
    sheetName: params.referenceName,
  }
}

function getSchematicSheetIndexesByComponentName(
  schematicCircuitJsons: AnyCircuitElement[][],
): Map<ComponentName, number[]> {
  const schematicSheetIndexesByComponentName = new Map<ComponentName, number[]>()
  for (const [schematicSheetIndex, schematicCircuitJson] of schematicCircuitJsons.entries()) {
    for (const component of schematicCircuitJson.filter(isSourceComponent)) {
      const sheetIndexes = schematicSheetIndexesByComponentName.get(component.name) ?? []
      if (!sheetIndexes.includes(schematicSheetIndex)) sheetIndexes.push(schematicSheetIndex)
      schematicSheetIndexesByComponentName.set(component.name, sheetIndexes)
    }
  }
  return schematicSheetIndexesByComponentName
}

function getRemovableFeatureId(params: {
  componentName: ComponentName
  reference: ReferenceInput
  schematicSheetIndexesByComponentName: ReadonlyMap<ComponentName, number[]>
}): string | undefined {
  const schematicSheetIndexes =
    params.schematicSheetIndexesByComponentName.get(params.componentName) ?? []
  if (schematicSheetIndexes.length === 0) return undefined

  const featureIds = schematicSheetIndexes.map(
    (schematicSheetIndex) =>
      params.reference.removableFeatureIdBySchematicSheetIndex[schematicSheetIndex],
  )
  if (featureIds.some((featureId) => featureId === undefined)) return undefined
  const uniqueFeatureIds = new Set(featureIds)
  return uniqueFeatureIds.size === 1 ? featureIds[0] : undefined
}

function getRecordString(params: { record: AltiumComponentRecord; key: string }): string {
  const recordText = params.record.get(params.key)
  return typeof recordText === "string" ? recordText : ""
}
