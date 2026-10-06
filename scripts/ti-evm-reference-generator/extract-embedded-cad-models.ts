import { createHash } from "node:crypto"
import { mkdir, rm } from "node:fs/promises"
import { resolve } from "node:path"
import type { AltiumBinaryPcbDoc } from "altiumts"
import { convertStepToGlb } from "./convert-step-to-glb"

type EmbeddedModelIndex = number
type EmbeddedModelContentHash = string
type EmbeddedModelUrl = string

export type EmbeddedModelUrls = {
  glbUrl: EmbeddedModelUrl
  stepUrl: EmbeddedModelUrl
}

export type EmbeddedModelUrlsByIndex = Map<EmbeddedModelIndex, EmbeddedModelUrls>

export async function extractEmbeddedCadModels(params: {
  outputDirectory: string
  pcbDocument: AltiumBinaryPcbDoc
  referenceId: string
}): Promise<EmbeddedModelUrlsByIndex> {
  const modelDirectory = resolve(params.outputDirectory, params.referenceId)
  await rm(modelDirectory, { force: true, recursive: true })
  await mkdir(modelDirectory, { recursive: true })

  const modelUrlsByIndex: EmbeddedModelUrlsByIndex = new Map()
  const modelUrlsByContentHash = new Map<EmbeddedModelContentHash, EmbeddedModelUrls>()
  for (const embeddedModel of params.pcbDocument.embeddedModels) {
    const modelBytes = await embeddedModel.getDecompressedBytes()
    const contentHash = createHash("sha256").update(modelBytes).digest("hex")
    let modelUrls = modelUrlsByContentHash.get(contentHash)

    if (!modelUrls) {
      const baseUrl = `/cad-models/${params.referenceId}/${embeddedModel.index}`
      modelUrls = {
        glbUrl: `${baseUrl}.glb`,
        stepUrl: `${baseUrl}.step`,
      }
      const glb = await convertStepToGlb({ stepBytes: modelBytes })
      await Bun.write(resolve(modelDirectory, `${embeddedModel.index}.glb`), glb)
      modelUrlsByContentHash.set(contentHash, modelUrls)
    }

    modelUrlsByIndex.set(embeddedModel.index, modelUrls)
  }

  return modelUrlsByIndex
}
