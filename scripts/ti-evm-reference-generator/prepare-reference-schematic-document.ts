import type { AltiumSchDoc } from "altiumts"
import type { ConvertAltiumSchDocOptions } from "altium-to-circuit-json"
import { fitSchematicImagesToSheet } from "./fit-schematic-images-to-sheet"
import { hideOffSheetDraftingNotes } from "./hide-off-sheet-drafting-notes"
import { hideUnavailableTitleBlockFields } from "./hide-unavailable-title-block-fields"

export function prepareReferenceSchematicDocument(params: {
  document: AltiumSchDoc
  options: ConvertAltiumSchDocOptions
}): void {
  fitSchematicImagesToSheet(params.document)
  hideOffSheetDraftingNotes(params.document)
  hideUnavailableTitleBlockFields(params)
}
