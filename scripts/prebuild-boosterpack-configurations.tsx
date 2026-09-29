import { mkdir, mkdtemp, rename, rm } from "node:fs/promises"
import { availableParallelism } from "node:os"
import { resolve } from "node:path"
import {
  boosterPackBoards,
  boosterPackSourceCommit,
  type BoosterPackBoard,
  type BoosterPackConfiguration,
  type BoosterPackConfigurationId,
  type BoosterPackId,
} from "../lib/boosterpack-configurations"
import type { ConfigurationRenderResult } from "./render-boosterpack-configuration"

type ManifestEntry = {
  boardId: BoosterPackId
  configurationId: BoosterPackConfigurationId
  removedFeatureIds: string[]
  circuitElementCount: number
  compressedBytes: number
}

type PrebuildTask = {
  board: BoosterPackBoard
  configuration: BoosterPackConfiguration
}

const renderConcurrency = Math.min(4, availableParallelism())
const outputDirectory = resolve(import.meta.dir, "../public/prebuilt-boosterpacks")
const outputParentDirectory = resolve(outputDirectory, "..")
const workerScriptPath = resolve(import.meta.dir, "render-boosterpack-configuration-worker.ts")
await mkdir(outputParentDirectory, { recursive: true })
const stagingDirectory = await mkdtemp(resolve(outputParentDirectory, ".prebuilt-boosterpacks-"))
const prebuildTasks = boosterPackBoards.flatMap((board) =>
  board.configurations.map((configuration) => ({ board, configuration })),
)

try {
  const manifest = await mapWithConcurrency({
    items: prebuildTasks,
    concurrency: renderConcurrency,
    transform: renderConfigurationInSubprocess,
  })

  if (
    manifest.length !== boosterPackBoards.flatMap(({ configurations }) => configurations).length
  ) {
    throw new Error("Prebuilt manifest does not cover every BoosterPack configuration")
  }

  await Bun.write(
    resolve(stagingDirectory, "manifest.json"),
    `${JSON.stringify({ sourceCommit: boosterPackSourceCommit, configurations: manifest }, null, 2)}\n`,
  )
  await rm(outputDirectory, { recursive: true, force: true })
  await rename(stagingDirectory, outputDirectory)
} catch (error) {
  await rm(stagingDirectory, { recursive: true, force: true })
  throw error
}

async function renderConfigurationInSubprocess(params: PrebuildTask): Promise<ManifestEntry> {
  const startedAt = performance.now()
  const subprocess = Bun.spawn(
    [
      process.execPath,
      workerScriptPath,
      params.board.id,
      params.configuration.id,
      stagingDirectory,
    ],
    { stdout: "pipe", stderr: "inherit" },
  )
  const workerOutput = await new Response(subprocess.stdout).text()
  const exitCode = await subprocess.exited
  if (exitCode !== 0) {
    throw new Error(`${params.configuration.id} render exited with code ${exitCode}`)
  }

  const workerResult: unknown = JSON.parse(workerOutput)
  if (!isConfigurationRenderResult(workerResult)) {
    throw new Error(`${params.configuration.id} render returned an invalid result`)
  }

  console.log(
    `${params.configuration.id}: rendered ${workerResult.circuitElementCount} elements in ${(
      (performance.now() - startedAt) / 1000
    ).toFixed(1)}s`,
  )

  return {
    boardId: params.board.id,
    configurationId: params.configuration.id,
    removedFeatureIds: params.configuration.removedFeatureIds,
    circuitElementCount: workerResult.circuitElementCount,
    compressedBytes: workerResult.compressedBytes,
  }
}

function isConfigurationRenderResult(value: unknown): value is ConfigurationRenderResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "circuitElementCount" in value &&
    typeof value.circuitElementCount === "number" &&
    "compressedBytes" in value &&
    typeof value.compressedBytes === "number"
  )
}

async function mapWithConcurrency<Item, Result>(params: {
  items: Item[]
  concurrency: number
  transform: (item: Item) => Promise<Result>
}): Promise<Result[]> {
  const results = new Array<Result>(params.items.length)
  let nextIndex = 0
  let firstError: unknown
  let hasFailed = false

  const workers = Array.from(
    { length: Math.min(params.concurrency, params.items.length) },
    async () => {
      while (nextIndex < params.items.length && !hasFailed) {
        const index = nextIndex
        nextIndex += 1
        try {
          results[index] = await params.transform(params.items[index])
        } catch (error) {
          firstError = error
          hasFailed = true
        }
      }
    },
  )
  await Promise.all(workers)
  if (hasFailed) throw firstError
  return results
}
