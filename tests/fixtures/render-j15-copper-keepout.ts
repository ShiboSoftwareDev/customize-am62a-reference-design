import { mkdtemp, mkdir, rm } from "node:fs/promises"
import { join, resolve } from "node:path"
import { Circuit } from "@tscircuit/core"
import { convertAltiumPcbDocToCircuitJson } from "altium-to-circuit-json"
import { parseAltiumPcbDoc } from "altiumts"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToTscircuit } from "circuit-json-to-tscircuit"
import { createElement, type ComponentType } from "react"
import { parameterizeGeneratedBoard } from "../../scripts/parameterize-generated-board"
import { prepareAuthoredCopperPours } from "../../scripts/ti-evm-reference-generator/prepare-authored-copper-pours"
import { getSupportedCopperPours } from "../../scripts/ti-evm-reference-generator/get-supported-copper-pours"

type SourceComponentId = string

export async function renderJ15CopperKeepout(
  removedFeatureIds: string[] = [],
): Promise<AnyCircuitElement[]> {
  // The peg and copper keepout are extracted from TI's TMDS62LEVM J15 footprint.
  const pcbDocument = parseAltiumPcbDoc(
    await Bun.file(resolve(import.meta.dir, "tmds62levm-j15-copper-keepout.PcbDoc")).text(),
  )
  const circuitJson = convertAltiumPcbDocToCircuitJson(pcbDocument)
  const featureIdBySourceComponentId = new Map<SourceComponentId, string>(
    circuitJson.flatMap((element) =>
      element.type === "source_component" &&
      element.name === "J15" &&
      typeof element.source_component_id === "string"
        ? [[element.source_component_id, "usb"]]
        : [],
    ),
  )
  const prepared = prepareAuthoredCopperPours({
    pcbDocument,
    circuitJson,
    featureIdBySourceComponentId,
  })
  const generatedSource = convertCircuitJsonToTscircuit(prepared.circuitJson, {
    componentName: "J15Board",
  })
  const { source } = parameterizeGeneratedBoard({
    componentName: "J15Board",
    generatedSource,
    featureIdByComponentName: new Map([["J15", "usb"]]),
    routablePortSelectors: new Set(),
    teardropPortSelectors: new Set(),
    viaTeardropPortSelectors: new Set(),
    computeAllCopperPours: true,
    supportedCopperPours: getSupportedCopperPours({
      circuitJson: prepared.circuitJson,
      computedCopperPourSettingsById: prepared.computedCopperPourSettingsById,
      featureIdBySourceComponentId,
    }),
  })
  const scratchRoot = resolve(import.meta.dir, "../../tmp")
  await mkdir(scratchRoot, { recursive: true })
  const temporaryDirectory = await mkdtemp(join(scratchRoot, "j15-keepout-test-"))
  try {
    const sourcePath = join(temporaryDirectory, "board.tsx")
    await Bun.write(sourcePath, source)
    const { default: Board }: { default: ComponentType<{ removedFeatureIds: string[] }> } =
      await import(sourcePath)
    const circuit = new Circuit()
    circuit.add(createElement(Board, { removedFeatureIds }))
    await circuit.renderUntilSettled()
    return circuit.getCircuitJson()
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true })
  }
}
