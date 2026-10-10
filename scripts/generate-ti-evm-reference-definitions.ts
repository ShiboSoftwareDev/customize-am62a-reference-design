import { mkdir, rm } from "node:fs/promises"
import { resolve } from "node:path"
import { generateReferenceArtifacts } from "./ti-evm-reference-generator/generate-reference-artifacts"
import { referenceInputs } from "./ti-evm-reference-generator/references"

const outputDirectory = resolve(import.meta.dir, "../lib/generated/ti-evms")
const cadModelOutputDirectory = resolve(import.meta.dir, "../public/cad-models/ti-evms")
await mkdir(outputDirectory, { recursive: true })
await rm(cadModelOutputDirectory, { force: true, recursive: true })
await mkdir(cadModelOutputDirectory, { recursive: true })

for (const reference of referenceInputs) {
  await generateReferenceArtifacts({
    cadModelOutputDirectory,
    outputDirectory,
    reference,
  })
}
