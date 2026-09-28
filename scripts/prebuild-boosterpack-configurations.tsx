import { mkdir, readdir, unlink } from "node:fs/promises"
import { resolve } from "node:path"
import { Circuit } from "@tscircuit/core"
import AudioBoosterPack from "@tsci/tscircuit.boosters/boostxl-audio/index.circuit.tsx"
import BuildingAutomationSensorsBoosterPack from "@tsci/tscircuit.boosters/boostxl-bassensors/index.circuit.tsx"
import WirelessBoosterPack from "@tsci/tscircuit.boosters/boostxl-cc2650ma/index.circuit.tsx"
import EducationalBoosterPack from "@tsci/tscircuit.boosters/boostxl-edumkii/index.circuit.tsx"
import MotorDriverBoosterPack from "@tsci/tscircuit.boosters/boost-drv8848/index.circuit.tsx"
import type { AnyCircuitElement } from "circuit-json"
import { gzipSync, strToU8 } from "fflate"
import type { ReactNode } from "react"
import {
  boosterPackBoards,
  boosterPackSourceCommit,
  type BoosterPackConfigurationId,
  type BoosterPackId,
} from "../lib/boosterpack-configurations"
import { configureBoosterPackElement } from "../lib/configure-boosterpack-element"

const boardComponents: Record<BoosterPackId, () => ReactNode> = {
  boostxl_edumkii: EducationalBoosterPack,
  boost_drv8848: MotorDriverBoosterPack,
  boostxl_bassensors: BuildingAutomationSensorsBoosterPack,
  boostxl_audio: AudioBoosterPack,
  boostxl_cc2650ma: WirelessBoosterPack,
}

const prebuiltConfigurations = boosterPackBoards.flatMap((board) =>
  board.configurations.map((configuration) => ({ boardId: board.id, configuration })),
)

const outputDirectory = resolve(import.meta.dir, "../public/prebuilt-boosterpacks")
await mkdir(outputDirectory, { recursive: true })
for (const fileName of await readdir(outputDirectory)) {
  if (fileName.endsWith(".circuit.json.gz") || fileName === "manifest.json") {
    await unlink(resolve(outputDirectory, fileName))
  }
}

const manifest: Array<{
  boardId: BoosterPackId
  configurationId: BoosterPackConfigurationId
  circuitElementCount: number
  compressedBytes: number
}> = []

for (const configuration of prebuiltConfigurations) {
  const startedAt = performance.now()
  const boardElement = boardComponents[configuration.boardId]()
  const configuredBoardElement = configureBoosterPackElement({
    element: boardElement,
    excludedElementNames: configuration.configuration.excludedElementNames,
  })
  const circuit = new Circuit({ platform: { drcChecksDisabled: true } })
  circuit._featureMspSchematicTraceRouting = false
  circuit.add(configuredBoardElement)
  await circuit.renderUntilSettled()

  const circuitJson = circuit.getCircuitJson() as AnyCircuitElement[]
  const sourceErrors = circuitJson.filter((element) =>
    element.type.startsWith("source_failed_to_create_component_error"),
  )
  if (sourceErrors.length > 0) {
    throw new Error(
      `${configuration.configuration.id} produced ${sourceErrors.length} source errors`,
    )
  }

  const compressedCircuitJson = gzipSync(strToU8(JSON.stringify(circuitJson)), { level: 9 })
  await Bun.write(
    resolve(outputDirectory, `${configuration.configuration.id}.circuit.json.gz`),
    compressedCircuitJson,
  )
  manifest.push({
    boardId: configuration.boardId,
    configurationId: configuration.configuration.id,
    circuitElementCount: circuitJson.length,
    compressedBytes: compressedCircuitJson.byteLength,
  })
  console.log(
    `${configuration.configuration.id}: ${circuitJson.length} elements in ${(
      (performance.now() - startedAt) / 1000
    ).toFixed(1)}s`,
  )
}

if (manifest.length !== boosterPackBoards.flatMap(({ configurations }) => configurations).length) {
  throw new Error("Prebuilt manifest does not cover every BoosterPack configuration")
}

await Bun.write(
  resolve(outputDirectory, "manifest.json"),
  `${JSON.stringify({ sourceCommit: boosterPackSourceCommit, configurations: manifest }, null, 2)}\n`,
)
