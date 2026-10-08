import type { ReferenceComponent } from "./reference-evm-types"

export function getReferenceSchematicComponentName(component: ReferenceComponent): string {
  return component.schematicName ?? component.name
}
