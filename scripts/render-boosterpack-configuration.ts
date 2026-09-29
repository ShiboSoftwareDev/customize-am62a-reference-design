import { resolve } from "node:path"
import { Circuit } from "@tscircuit/core"
import { gzipSync, strToU8 } from "fflate"
import type { BoosterPackBoard, BoosterPackConfiguration } from "../lib/boosterpack-configurations"
import { createBoosterPackElement } from "./create-boosterpack-element"

export type ConfigurationRenderResult = {
  circuitElementCount: number
  compressedBytes: number
}

export async function renderBoosterPackConfiguration(params: {
  board: BoosterPackBoard
  configuration: BoosterPackConfiguration
  outputDirectory: string
}): Promise<ConfigurationRenderResult> {
  const circuit = new Circuit()
  circuit.add(
    createBoosterPackElement({
      boardId: params.board.id,
      removedFeatureIds: params.configuration.removedFeatureIds,
    }),
  )
  await circuit.renderUntilSettled()

  const circuitJson = circuit.getCircuitJson()
  const sourceErrors = circuitJson.filter((element) =>
    element.type.startsWith("source_failed_to_create_component_error"),
  )
  if (sourceErrors.length > 0) {
    throw new Error(`${params.configuration.id} produced ${sourceErrors.length} source errors`)
  }
  const autoroutingErrors = circuitJson.filter(
    (element) => element.type === "pcb_autorouting_error",
  )
  if (autoroutingErrors.length > 0) {
    throw new Error(
      `${params.configuration.id} produced ${autoroutingErrors.length} autorouting errors`,
    )
  }

  const renderedElementNames = new Set(
    circuitJson.flatMap((element) =>
      "name" in element && typeof element.name === "string" ? [element.name] : [],
    ),
  )
  for (const expectedExcludedElementName of params.configuration.expectedExcludedElementNames) {
    if (renderedElementNames.has(expectedExcludedElementName)) {
      throw new Error(
        `${params.configuration.id} still contains excluded element ${expectedExcludedElementName}`,
      )
    }
  }

  const serializedCircuitJson = JSON.stringify(circuitJson)
  for (const expectedExcludedText of params.configuration.expectedExcludedText) {
    if (serializedCircuitJson.includes(expectedExcludedText)) {
      throw new Error(
        `${params.configuration.id} still contains excluded text ${expectedExcludedText}`,
      )
    }
  }

  const compressedCircuitJson = gzipSync(strToU8(serializedCircuitJson), { level: 9 })
  await Bun.write(
    resolve(params.outputDirectory, `${params.configuration.id}.circuit.json.gz`),
    compressedCircuitJson,
  )

  return {
    circuitElementCount: circuitJson.length,
    compressedBytes: compressedCircuitJson.byteLength,
  }
}
