import { expect } from "bun:test"
import {
  checkDanglingTraces,
  checkEachPcbPortConnectedToPcbTraces,
  checkSameNameNetsAreConnected,
  checkSourceTracesHavePcbTraces,
  checkTracesAreContiguous,
  runAllSchematicChecks,
} from "@tscircuit/checks"
import type { AnyCircuitElement } from "circuit-json"
import { resolve } from "node:path"
import { parsePrebuiltCircuitJson } from "app/parse-prebuilt-circuit-json"
import { getTiEvm, type TiEvmId } from "lib/ti-evm-catalog"

type ComponentName = string

type ElectricalVariantExpectation = {
  evmId: TiEvmId
  requiredComponentNames: ComponentName[]
}

export async function expectElectricallyValidVariants(
  expectation: ElectricalVariantExpectation,
): Promise<void> {
  const repositoryRoot = resolve(import.meta.dir, "../..")
  const evm = getTiEvm(expectation.evmId)
  const validationErrors: string[] = []

  for (const variant of evm.variants) {
    const pcbCircuitJson = await loadCompressedCircuitJson({
      repositoryRoot,
      publicUrl: variant.circuitJsonUrl,
    })
    const electricalErrors = [
      ...checkDanglingTraces(pcbCircuitJson),
      ...checkEachPcbPortConnectedToPcbTraces(pcbCircuitJson),
      ...checkSourceTracesHavePcbTraces(pcbCircuitJson),
      ...checkTracesAreContiguous(pcbCircuitJson),
      ...checkSameNameNetsAreConnected(pcbCircuitJson),
    ]
    validationErrors.push(...electricalErrors.map((error) => `${variant.id}: ${error.message}`))

    const sourceComponentNames = new Set<ComponentName>(
      pcbCircuitJson.flatMap((element) =>
        element.type === "source_component" && typeof element.name === "string"
          ? [element.name]
          : [],
      ),
    )
    for (const requiredComponentName of expectation.requiredComponentNames) {
      if (!sourceComponentNames.has(requiredComponentName)) {
        validationErrors.push(
          `${variant.id}: required component ${requiredComponentName} is missing`,
        )
      }
    }

    for (const schematicCircuitJsonUrl of variant.schematicCircuitJsonUrls) {
      const schematicCircuitJson = await loadCompressedCircuitJson({
        repositoryRoot,
        publicUrl: schematicCircuitJsonUrl,
      })
      validationErrors.push(
        ...getInvalidSchematicReferences(schematicCircuitJson).map(
          (error) => `${variant.id}: ${error}`,
        ),
      )
      const schematicIssues = await runAllSchematicChecks(schematicCircuitJson)
      validationErrors.push(
        ...schematicIssues
          .filter(({ type }) => type.includes("error"))
          .map((issue) => `${variant.id}: ${issue.message}`),
      )
    }
  }

  expect(validationErrors).toEqual([])
}

function getInvalidSchematicReferences(circuitJson: AnyCircuitElement[]): string[] {
  const sourceComponentIds = new Set(
    circuitJson.flatMap((element) =>
      element.type === "source_component" ? [element.source_component_id] : [],
    ),
  )
  const sourcePortIds = new Set(
    circuitJson.flatMap((element) =>
      element.type === "source_port" ? [element.source_port_id] : [],
    ),
  )
  const sourceTraceIds = new Set(
    circuitJson.flatMap((element) =>
      element.type === "source_trace" ? [element.source_trace_id] : [],
    ),
  )

  const invalidReferences: string[] = []
  for (const element of circuitJson) {
    if (element.type === "schematic_component") {
      if (!sourceComponentIds.has(element.source_component_id)) {
        invalidReferences.push(
          `schematic component ${element.schematic_component_id} references a missing source component`,
        )
      }
    }
    if (element.type === "schematic_port") {
      if (!sourcePortIds.has(element.source_port_id)) {
        invalidReferences.push(
          `schematic port ${element.schematic_port_id} references a missing source port`,
        )
      }
    }
    if (element.type === "schematic_trace") {
      if (!sourceTraceIds.has(element.source_trace_id)) {
        invalidReferences.push(
          `schematic trace ${element.schematic_trace_id} references a missing source trace`,
        )
      }
    }
  }
  return invalidReferences
}

async function loadCompressedCircuitJson(params: {
  repositoryRoot: string
  publicUrl: string
}): Promise<AnyCircuitElement[]> {
  const path = resolve(params.repositoryRoot, "public", params.publicUrl.replace(/^\//u, ""))
  return parsePrebuiltCircuitJson(new Uint8Array(await Bun.file(path).arrayBuffer()))
}
