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
import { filterCircuitJsonByElementNames } from "../lib/filter-circuit-json-by-element-names"

const boardComponents: Record<BoosterPackId, () => ReactNode> = {
  boostxl_edumkii: EducationalBoosterPack,
  boost_drv8848: MotorDriverBoosterPack,
  boostxl_bassensors: BuildingAutomationSensorsBoosterPack,
  boostxl_audio: AudioBoosterPack,
  boostxl_cc2650ma: WirelessBoosterPack,
}

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
  removedFeatureIds: string[]
  circuitElementCount: number
  compressedBytes: number
}> = []

for (const board of boosterPackBoards) {
  const startedAt = performance.now()
  const circuit = new Circuit({ platform: { drcChecksDisabled: true } })
  circuit._featureMspSchematicTraceRouting = false
  circuit.add(boardComponents[board.id]())
  await circuit.renderUntilSettled()

  const fullCircuitJson = circuit.getCircuitJson() as AnyCircuitElement[]
  const sourceErrors = fullCircuitJson.filter((element) =>
    element.type.startsWith("source_failed_to_create_component_error"),
  )
  if (sourceErrors.length > 0) {
    throw new Error(`${board.id} produced ${sourceErrors.length} source errors`)
  }

  console.log(
    `${board.id}: rendered ${fullCircuitJson.length} elements in ${(
      (performance.now() - startedAt) / 1000
    ).toFixed(1)}s; materializing ${board.configurations.length} combinations`,
  )

  for (const configuration of board.configurations) {
    const circuitJson = filterCircuitJsonByElementNames({
      circuitJson: fullCircuitJson,
      excludedElementNames: configuration.excludedElementNames,
    })
    const compressedCircuitJson = gzipSync(strToU8(JSON.stringify(circuitJson)), { level: 9 })
    await Bun.write(
      resolve(outputDirectory, `${configuration.id}.circuit.json.gz`),
      compressedCircuitJson,
    )
    manifest.push({
      boardId: board.id,
      configurationId: configuration.id,
      removedFeatureIds: configuration.removedFeatureIds,
      circuitElementCount: circuitJson.length,
      compressedBytes: compressedCircuitJson.byteLength,
    })
  }
}

if (manifest.length !== boosterPackBoards.flatMap(({ configurations }) => configurations).length) {
  throw new Error("Prebuilt manifest does not cover every BoosterPack configuration")
}

await Bun.write(
  resolve(outputDirectory, "manifest.json"),
  `${JSON.stringify({ sourceCommit: boosterPackSourceCommit, configurations: manifest }, null, 2)}\n`,
)
