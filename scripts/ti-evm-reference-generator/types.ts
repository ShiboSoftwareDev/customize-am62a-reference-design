import type { AnyCircuitElement } from "circuit-json"
import type { ReferenceEvmDefinition } from "../../lib/evms/reference-evm-types"

export type ComponentName = string
export type FeatureId = string
export type NetName = string
export type PcbComponentId = string
export type PinKey = string
export type PortHint = string
export type PortSelector = string
export type RawPinName = string
export type SourceComponentId = string
export type SourcePortId = string
export type ComponentRecordIndex = number
export type NetRecordIndex = number

export type ComponentNameByRecordIndex = Map<ComponentRecordIndex, ComponentName>
export type PinKeyByRawPinName = Map<RawPinName, PinKey>
export type PinKeysByComponentRecordIndex = Map<ComponentRecordIndex, PinKeyByRawPinName>

export type ReferenceInput = {
  id: string
  componentName: string
  exportName: string
  name: string
  sourceUrl: string
  archiveSha256: string
  pcbPath: string
  projectPath: string
  schematicPaths: string[]
  outputName: string
  getRemovableFeatureId: (componentName: ComponentName) => FeatureId | undefined
}

export type ReferenceConversion = {
  definition: ReferenceEvmDefinition
  projectCircuitJson: AnyCircuitElement[]
  referenceSchematicCircuitJsons: AnyCircuitElement[][]
}
