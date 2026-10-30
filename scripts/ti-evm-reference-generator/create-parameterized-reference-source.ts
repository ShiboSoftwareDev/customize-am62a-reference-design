import type { AltiumBinaryPcbDoc } from "altiumts"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToTscircuit } from "circuit-json-to-tscircuit"
import type { ReferenceEvmDefinition } from "../../lib/evms/reference-evm-types"
import { parameterizeGeneratedBoard } from "../parameterize-generated-board"
import { getFeatureIdBySourceComponentId } from "./get-feature-id-by-source-component-id"
import { getImportedRoutingMetadata } from "./get-imported-routing-metadata"
import { getRoutingConnectivityCheckCircuitJson } from "./get-routing-connectivity-check-circuit-json"
import { getSupportedCopperPours } from "./get-supported-copper-pours"
import { prepareAuthoredCopperPours } from "./prepare-authored-copper-pours"
import {
  getRoutablePortSelectors,
  prepareConverterCircuitJson,
} from "./prepare-converter-circuit-json"
import type { ComponentName, FeatureId, ReferenceInput } from "./types"

type PcbCopperPourId = string

export function createParameterizedReferenceSource(params: {
  definition: ReferenceEvmDefinition
  pcbDocument: AltiumBinaryPcbDoc
  projectCircuitJson: AnyCircuitElement[]
  reference: ReferenceInput
}) {
  const featureIdByComponentName = new Map<ComponentName, FeatureId>(
    params.definition.components.flatMap((component) =>
      component.removableFeatureId
        ? [[component.schematicName ?? component.name, component.removableFeatureId] as const]
        : [],
    ),
  )
  const featureIdBySourceComponentId = getFeatureIdBySourceComponentId({
    circuitJson: params.projectCircuitJson,
    featureIdByComponentName,
  })
  const routingCircuitJson = getRoutingConnectivityCheckCircuitJson({
    circuitJson: params.projectCircuitJson,
    featureIdBySourceComponentId,
  })
  const featureOwnedCopperPours = new Map<PcbCopperPourId, AnyCircuitElement>(
    routingCircuitJson.flatMap((element) =>
      element.type === "pcb_copper_pour" && typeof element.pcb_copper_pour_id === "string"
        ? [[element.pcb_copper_pour_id, element] as const]
        : [],
    ),
  )
  // Only transfer copper ownership. The connectivity-check copy also expands
  // via/hole layer spans and must not replace the converter's physical input.
  const projectWithFeatureOwnedCopper = params.projectCircuitJson.map((element) => {
    if (element.type !== "pcb_copper_pour" || typeof element.pcb_copper_pour_id !== "string")
      return element
    return featureOwnedCopperPours.get(element.pcb_copper_pour_id) ?? element
  })
  const { circuitJson, computedCopperPourSettingsById } = prepareAuthoredCopperPours({
    pcbDocument: params.pcbDocument,
    circuitJson: projectWithFeatureOwnedCopper,
    featureIdBySourceComponentId,
  })
  const converterCircuitJson = prepareConverterCircuitJson(circuitJson)
  const importedRoutingMetadata = getImportedRoutingMetadata({
    circuitJson: prepareConverterCircuitJson(params.projectCircuitJson),
    featureIdByComponentName,
    removedFeatureIdCombinations: params.reference.removedFeatureIdCombinations,
  })
  const generatedSource = convertCircuitJsonToTscircuit(converterCircuitJson, {
    componentName: params.reference.componentName,
  })
  return parameterizeGeneratedBoard({
    componentName: params.reference.componentName,
    featureIdByComponentName,
    generatedSource,
    importedRoutingMetadata,
    computeAllCopperPours: true,
    routablePortSelectors: getRoutablePortSelectors(converterCircuitJson),
    supportedCopperPours: getSupportedCopperPours({
      circuitJson: converterCircuitJson,
      computedCopperPourSettingsById,
      featureIdBySourceComponentId,
    }),
    teardropPortSelectors: new Set(
      params.definition.nets.flatMap((net) =>
        (net.teardropEndpoints ?? []).map(
          ({ componentName, pinKey }) => `.${componentName} > .${pinKey}`,
        ),
      ),
    ),
    viaTeardropPortSelectors: new Set(
      params.definition.nets.flatMap((net) =>
        net.hasViaTeardrops
          ? net.endpoints.map(({ componentName, pinKey }) => `.${componentName} > .${pinKey}`)
          : [],
      ),
    ),
  })
}
