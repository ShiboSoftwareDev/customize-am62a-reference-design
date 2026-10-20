import { expect, test } from "bun:test"
import { resolve } from "node:path"
import { parsePrebuiltCircuitJson } from "app/parse-prebuilt-circuit-json"
import type { AnyCircuitElement } from "circuit-json"
import { getParameterizedTiEvmDefinition } from "lib/evms/parameterized-ti-evms"
import { tiEvms } from "lib/ti-evm-catalog"

type PcbComponentId = string
type SourceComponentId = string
type NamedSourceComponent = AnyCircuitElement & {
  name: string
  source_component_id: SourceComponentId
  type: "source_component"
}
type LinkedPcbComponent = AnyCircuitElement & {
  pcb_component_id: PcbComponentId
  source_component_id: SourceComponentId
  type: "pcb_component"
}

test("generated definitions use the converted PCB component names", async () => {
  const repositoryRoot = resolve(import.meta.dir, "..")

  for (const evm of tiEvms) {
    const definition = getParameterizedTiEvmDefinition(evm.id)
    const circuitJson = await readSourceCircuitJson({ evmId: evm.id, repositoryRoot })
    const sourceComponentNameById = new Map<SourceComponentId, string>(
      circuitJson.flatMap((element) =>
        isNamedSourceComponent(element)
          ? [[element.source_component_id, element.name] as const]
          : [],
      ),
    )
    const sourceComponentIdByPcbComponentId = new Map<PcbComponentId, SourceComponentId>(
      circuitJson.flatMap((element) =>
        isLinkedPcbComponent(element)
          ? [[element.pcb_component_id, element.source_component_id] as const]
          : [],
      ),
    )
    const convertedNames = [...sourceComponentIdByPcbComponentId.values()]
      .flatMap((sourceComponentId) => {
        const componentName = sourceComponentId
          ? sourceComponentNameById.get(sourceComponentId)
          : undefined
        return componentName ? [componentName] : []
      })
      .sort()

    expect(definition.components.map(({ name }) => name).sort()).toEqual(convertedNames)
  }
}, 120_000)

function isNamedSourceComponent(element: AnyCircuitElement): element is NamedSourceComponent {
  return (
    element.type === "source_component" &&
    typeof element.source_component_id === "string" &&
    typeof element.name === "string"
  )
}

function isLinkedPcbComponent(element: AnyCircuitElement): element is LinkedPcbComponent {
  return (
    element.type === "pcb_component" &&
    typeof element.pcb_component_id === "string" &&
    typeof element.source_component_id === "string"
  )
}

async function readSourceCircuitJson(params: {
  evmId: string
  repositoryRoot: string
}): Promise<AnyCircuitElement[]> {
  const path = resolve(
    params.repositoryRoot,
    `lib/generated/ti-evms/${params.evmId}.source.circuit.json.gz`,
  )
  return parsePrebuiltCircuitJson(new Uint8Array(await Bun.file(path).arrayBuffer()))
}
