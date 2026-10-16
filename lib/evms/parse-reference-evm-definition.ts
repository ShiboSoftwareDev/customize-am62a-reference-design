import type { ReferenceEvmDefinition } from "./reference-evm-types"

export function parseReferenceEvmDefinition(serializedDefinition: string): ReferenceEvmDefinition {
  const definition: unknown = JSON.parse(serializedDefinition)
  if (!isReferenceEvmDefinition(definition)) {
    throw new Error("Generated reference EVM definition is invalid")
  }
  return definition
}

function isReferenceEvmDefinition(candidate: unknown): candidate is ReferenceEvmDefinition {
  return (
    isRecord(candidate) &&
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.sourceUrl === "string" &&
    typeof candidate.sourceArchiveSha256 === "string" &&
    typeof candidate.sourcePcbPath === "string" &&
    isStringArray(candidate.sourceSchematicPaths) &&
    Array.isArray(candidate.outline) &&
    typeof candidate.width === "number" &&
    typeof candidate.height === "number" &&
    typeof candidate.thickness === "number" &&
    isSupportedLayerCount(candidate.layers) &&
    Array.isArray(candidate.components) &&
    Array.isArray(candidate.nets) &&
    Array.isArray(candidate.standaloneHoles) &&
    Array.isArray(candidate.silkscreen)
  )
}

function isRecord(candidate: unknown): candidate is Record<string, unknown> {
  return typeof candidate === "object" && candidate !== null
}

function isStringArray(candidate: unknown): candidate is string[] {
  return Array.isArray(candidate) && candidate.every((value) => typeof value === "string")
}

function isSupportedLayerCount(candidate: unknown): candidate is 2 | 4 | 6 | 8 | 10 {
  return typeof candidate === "number" && [2, 4, 6, 8, 10].includes(candidate)
}
