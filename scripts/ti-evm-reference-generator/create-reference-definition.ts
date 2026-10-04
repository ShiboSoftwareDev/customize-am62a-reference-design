import { readFile } from "node:fs/promises"
import { basename } from "node:path"
import {
  convertAltiumProjectToCircuitJson,
  convertAltiumToCircuitJson,
} from "altium-to-circuit-json"
import {
  AltiumComponentRecord,
  AltiumNetRecord,
  AltiumPadRecord,
  AltiumPrjPcb,
  AltiumSchDoc,
  parseAltiumBinaryPcbDoc,
  parseAltiumFile,
} from "altiumts"
import type {
  ReferenceComponent,
  ReferenceNet,
  ReferenceSchematicPlacement,
} from "../../lib/evms/reference-evm-types"
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
  PinKeysByComponentRecordIndex,
  ReferenceConversion,
  ReferenceInput,
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
  const schematicDocuments = await Promise.all(
    reference.schematicPaths.map(async (schematicPath) => {
      const schematicDocument = parseAltiumFile(
        new Uint8Array(await readFile(schematicPath)),
      ).document
      if (!(schematicDocument instanceof AltiumSchDoc)) {
        throw new Error(`${schematicPath} is not an Altium schematic document`)
      }
      return { document: schematicDocument, path: schematicPath }
    }),
  )
  const projectCircuitJson = convertAltiumProjectToCircuitJson({
    pcb: {
      document: pcbDocument,
      options: {
        includeCopperAreas: false,
        includeTraces: false,
        includeVias: false,
        project: parsedProject,
      },
    },
    schematics: schematicDocuments.map(({ document, path }) => ({
      document,
      options: {
        documentName: basename(path),
        project: parsedProject,
        projectName: basename(reference.projectPath),
        sheetName: reference.name,
      },
    })),
  })
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
        schematic: {
          documentName: basename(schematicPath),
          project: parsedProject,
          projectName: basename(reference.projectPath),
          sheetName: reference.name,
        },
      })
    }),
  )
  const schematicCircuitJson = schematicCircuitJsons.flat()
  const board = pcbCircuitJson.find(isPcbBoard)
  if (!board) {
    throw new Error(`${reference.name} has no PCB board`)
  }
  if (![2, 4, 6, 8, 10].includes(board.num_layers)) {
    throw new Error(`${reference.name} has unsupported ${board.num_layers}-layer stack`)
  }

  const componentRecords = (pcbDocument.propertyRecords.get("Components6") ?? []).filter(
    (record): record is AltiumComponentRecord => record instanceof AltiumComponentRecord,
  )
  const padRecords = (pcbDocument.primitiveRecords.get("Pads6") ?? []).filter(
    (record): record is AltiumPadRecord => record instanceof AltiumPadRecord,
  )
  const netRecords = (pcbDocument.propertyRecords.get("Nets6") ?? []).filter(
    (record): record is AltiumNetRecord => record instanceof AltiumNetRecord,
  )
  const componentElements = new Map(
    pcbCircuitJson
      .filter(isPcbComponent)
      .map((element) => [getTrailingIndex(element.source_component_id), element]),
  )
  const componentNames = createComponentNames(componentRecords)
  const schematicPlacements = new Map<ComponentRecordIndex, ReferenceSchematicPlacement>()
  for (const sheetCircuitJson of schematicCircuitJsons) {
    for (const [componentIndex, placement] of createSchematicPlacements({
      componentRecords,
      padRecords,
      schematicCircuitJson: sheetCircuitJson,
    })) {
      if (!schematicPlacements.has(componentIndex)) {
        schematicPlacements.set(componentIndex, placement)
      }
    }
  }
  const sourceComponents = new Map<ComponentName, SourceComponentElement>(
    schematicCircuitJson.filter(isSourceComponent).map((component) => [component.name, component]),
  )

  const components: ReferenceComponent[] = []
  const componentPinKeys: PinKeysByComponentRecordIndex = new Map()
  for (const [componentIndex, componentRecord] of componentRecords.entries()) {
    const componentElement = componentElements.get(componentIndex)
    if (!componentElement || componentElement.type !== "pcb_component") continue
    const ownedPadRecords = padRecords.filter(
      ({ componentIndex: ownerIndex }) => ownerIndex === componentIndex,
    )
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
    const sourceComponent = sourceComponents.get(componentRecord.designator ?? "")
    const componentName = componentNames.get(componentIndex)
    if (!componentName) {
      throw new Error(`${reference.name} component ${componentIndex} has no generated name`)
    }
    components.push({
      name: componentName,
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
      removableFeatureId: reference.getRemovableFeatureId(
        componentRecord.designator ?? componentName,
      ),
      schematic: schematicPlacements.get(componentIndex),
    })
  }

  const populatedComponentIndexes = new Set<ComponentRecordIndex>(componentPinKeys.keys())
  const teardropsByNet = getTeardropsByNet({
    pcbDocument,
    padRecords,
    componentNames,
    componentPinKeys,
  })
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

  return {
    definition: {
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
    },
    projectCircuitJson,
    referenceSchematicCircuitJsons: schematicCircuitJsons,
  }
}

function getRecordString(params: { record: AltiumComponentRecord; key: string }): string {
  const recordText = params.record.get(params.key)
  return typeof recordText === "string" ? recordText : ""
}
