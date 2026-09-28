import { mkdir } from "node:fs/promises"
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

type PrebuiltConfiguration = {
  boardId: BoosterPackId
  configurationId: BoosterPackConfigurationId
  excludedElementNames: string[]
}

const boardComponents: Record<BoosterPackId, () => ReactNode> = {
  boostxl_edumkii: EducationalBoosterPack,
  boost_drv8848: MotorDriverBoosterPack,
  boostxl_bassensors: BuildingAutomationSensorsBoosterPack,
  boostxl_audio: AudioBoosterPack,
  boostxl_cc2650ma: WirelessBoosterPack,
}

const prebuiltConfigurations: PrebuiltConfiguration[] = [
  {
    boardId: "boostxl_edumkii",
    configurationId: "boostxl_edumkii_full",
    excludedElementNames: [],
  },
  {
    boardId: "boostxl_edumkii",
    configurationId: "boostxl_edumkii_sensor_lab",
    excludedElementNames: [
      "DisplaySchematic",
      "ControlsSchematic",
      "AudioSchematic",
      "OutputsSchematic",
      "ExpansionSchematic",
      "PowerSchematic",
    ],
  },
  {
    boardId: "boost_drv8848",
    configurationId: "boost_drv8848_full",
    excludedElementNames: [],
  },
  {
    boardId: "boost_drv8848",
    configurationId: "boost_drv8848_no_indicators",
    excludedElementNames: ["D1", "D2", "R2", "R6"],
  },
  {
    boardId: "boostxl_bassensors",
    configurationId: "boostxl_bassensors_full",
    excludedElementNames: [],
  },
  {
    boardId: "boostxl_bassensors",
    configurationId: "boostxl_bassensors_environmental",
    excludedElementNames: [
      "DRV5055_BLOCK",
      "OPT3001_BLOCK",
      "03 - DRV5055 Hall Sensor",
      "05 - OPT3001 Ambient Light",
    ],
  },
  {
    boardId: "boostxl_audio",
    configurationId: "boostxl_audio_full",
    excludedElementNames: [],
  },
  {
    boardId: "boostxl_audio",
    configurationId: "boostxl_audio_playback",
    excludedElementNames: ["MICROPHONE_AMPLIFIER"],
  },
  {
    boardId: "boostxl_cc2650ma",
    configurationId: "boostxl_cc2650ma_full",
    excludedElementNames: [],
  },
  {
    boardId: "boostxl_cc2650ma",
    configurationId: "boostxl_cc2650ma_radio_only",
    excludedElementNames: ["DEBUG_AND_FLASH", "debug-flash"],
  },
]

const outputDirectory = resolve(import.meta.dir, "../public/prebuilt-boosterpacks")
await mkdir(outputDirectory, { recursive: true })

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
    excludedElementNames: configuration.excludedElementNames,
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
      `${configuration.configurationId} produced ${sourceErrors.length} source errors`,
    )
  }

  const compressedCircuitJson = gzipSync(strToU8(JSON.stringify(circuitJson)), { level: 9 })
  await Bun.write(
    resolve(outputDirectory, `${configuration.configurationId}.circuit.json.gz`),
    compressedCircuitJson,
  )
  manifest.push({
    boardId: configuration.boardId,
    configurationId: configuration.configurationId,
    circuitElementCount: circuitJson.length,
    compressedBytes: compressedCircuitJson.byteLength,
  })
  console.log(
    `${configuration.configurationId}: ${circuitJson.length} elements in ${(
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
