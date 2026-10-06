import { createHash } from "node:crypto"
import { mkdir, rm } from "node:fs/promises"
import { resolve } from "node:path"
import type { AltiumBinaryPcbDoc } from "altiumts"

type EmbeddedModelIndex = number
type EmbeddedModelContentHash = string
type EmbeddedModelUrl = string

export type EmbeddedModelUrlByIndex = Map<EmbeddedModelIndex, EmbeddedModelUrl>

export async function extractEmbeddedCadModels(params: {
  outputDirectory: string
  pcbDocument: AltiumBinaryPcbDoc
  referenceId: string
}): Promise<EmbeddedModelUrlByIndex> {
  const modelDirectory = resolve(params.outputDirectory, params.referenceId)
  await rm(modelDirectory, { force: true, recursive: true })
  await mkdir(modelDirectory, { recursive: true })

  const modelUrlByIndex: EmbeddedModelUrlByIndex = new Map()
  const modelUrlByContentHash = new Map<EmbeddedModelContentHash, EmbeddedModelUrl>()
  for (const embeddedModel of params.pcbDocument.embeddedModels) {
    const modelBytes = await embeddedModel.getDecompressedBytes()
    const contentHash = createHash("sha256").update(modelBytes).digest("hex")
    let modelUrl = modelUrlByContentHash.get(contentHash)

    if (!modelUrl) {
      const fileName = `${embeddedModel.index}.step`
      modelUrl = `/cad-models/${params.referenceId}/${fileName}`
      await Bun.write(resolve(modelDirectory, fileName), modelBytes)
      modelUrlByContentHash.set(contentHash, modelUrl)
    }

    modelUrlByIndex.set(embeddedModel.index, modelUrl)
  }

  return modelUrlByIndex
}
