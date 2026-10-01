import { mkdir } from "node:fs/promises"
import { resolve } from "node:path"
import { generateReferenceArtifacts } from "./ti-evm-reference-generator/generate-reference-artifacts"
import { referenceInputs } from "./ti-evm-reference-generator/references"

const outputDirectory = resolve(import.meta.dir, "../lib/generated/ti-evms")
await mkdir(outputDirectory, { recursive: true })

for (const reference of referenceInputs) {
  await generateReferenceArtifacts({ outputDirectory, reference })
}
