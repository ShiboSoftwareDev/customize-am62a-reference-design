import ts from "typescript"
import type { SupportedCopperPour } from "../ti-evm-reference-generator/get-supported-copper-pours"
import { applyReplacements, type SourceReplacement } from "./ast-helpers"

export function applyCopperPourSettings(params: {
  copperPourElement: ts.JsxSelfClosingElement
  sourceFile: ts.SourceFile
  generatedSource: string
  supportedCopperPour: SupportedCopperPour
  computeAllCopperPours: boolean
}): string {
  const start = params.copperPourElement.getStart(params.sourceFile)
  const originalSource = params.generatedSource.slice(start, params.copperPourElement.getEnd())
  if (
    !params.computeAllCopperPours ||
    params.supportedCopperPour.computedSettings?.preserveReferenceCopper
  )
    return originalSource

  const clearance = params.supportedCopperPour.computedSettings?.clearance
  const replacements: SourceReplacement[] = []
  for (const attribute of params.copperPourElement.attributes.properties) {
    if (!ts.isJsxAttribute(attribute)) continue
    const name = attribute.name.getText(params.sourceFile)
    // Fixed copper stays a zero-clearance region, but must participate in the
    // same solver pass so new different-net pours clear it too.
    if ((clearance === undefined || clearance === 0) && name === "boardEdgeMargin") {
      replacements.push({
        start: attribute.getStart(params.sourceFile) - start,
        end: attribute.getEnd() - start,
        text: "",
      })
    } else if (
      clearance !== undefined &&
      ["clearance", "padMargin", "traceMargin", "cutoutMargin"].includes(name)
    ) {
      replacements.push({
        start: attribute.getStart(params.sourceFile) - start,
        end: attribute.getEnd() - start,
        text: `${name}={${clearance}}`,
      })
    }
  }
  return applyReplacements({ source: originalSource, replacements })
}
