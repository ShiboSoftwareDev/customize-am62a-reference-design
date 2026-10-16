import { mkdir, rm } from "node:fs/promises"
import { resolve } from "node:path"
import { generateReferenceArtifacts } from "./ti-evm-reference-generator/generate-reference-artifacts"
import { referenceInputs } from "./ti-evm-reference-generator/references"

const outputDirectory = resolve(import.meta.dir, "../lib/generated/ti-evms")
const cadModelOutputDirectory = resolve(import.meta.dir, "../public/cad-models/ti-evms")
const requestedReferenceIds = new Set(process.argv.slice(2))
const referencesToGenerate = referenceInputs.filter(
  ({ id }) => requestedReferenceIds.size === 0 || requestedReferenceIds.has(id),
)
if (referencesToGenerate.length === 0) {
  throw new Error(`No matching reference: ${[...requestedReferenceIds].join(", ")}`)
}
await mkdir(outputDirectory, { recursive: true })
if (requestedReferenceIds.size === 0) {
  await rm(cadModelOutputDirectory, { force: true, recursive: true })
  await mkdir(cadModelOutputDirectory, { recursive: true })
}

for (const reference of referencesToGenerate) {
  console.log(`${reference.name}: converting source project`)
  await generateReferenceArtifacts({
    cadModelOutputDirectory,
    outputDirectory,
    reference,
  })
}
