import type { AltiumPrjPcb } from "altiumts"
import { basename } from "node:path"

export function getSchematicConversionOptions(params: {
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
