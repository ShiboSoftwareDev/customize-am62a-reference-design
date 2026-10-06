import { mkdir } from "node:fs/promises"
import { resolve } from "node:path"
import { generateReferenceArtifacts } from "./ti-evm-reference-generator/generate-reference-artifacts"
import { referenceInputs } from "./ti-evm-reference-generator/references"

const outputDirectory = resolve(import.meta.dir, "../lib/generated/ti-evms")
const cadModelOutputDirectory = resolve(import.meta.dir, "../public/cad-models")
await mkdir(outputDirectory, { recursive: true })

for (const reference of referenceInputs) {
  await generateReferenceArtifacts({
    cadModelOutputDirectory,
    outputDirectory,
    reference,
  })
}
