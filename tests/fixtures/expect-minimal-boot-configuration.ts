import { expect } from "bun:test"
import { resolve } from "node:path"
import { parsePrebuiltCircuitJson } from "app/parse-prebuilt-circuit-json"
import { getFullConnectivityMapFromCircuitJson } from "circuit-json-to-connectivity-map"
import {
  getTiEvm,
  getTiEvmVariant,
  getTiEvmVariantSchematicCircuitJsonUrls,
  type TiEvmId,
} from "lib/ti-evm-catalog"

type SourceComponentId = string
type SourcePortId = string
type NetName = string

export async function expectMinimalBootConfiguration({
  evmId,
  retainedComponents,
  omittedComponents,
  requiredNetMembers,
}: {
  evmId: TiEvmId
  retainedComponents: string[]
  omittedComponents: string[]
  requiredNetMembers: Record<NetName, string[]>
}): Promise<void> {
  const evm = getTiEvm(evmId)
  const fullBoard = getTiEvmVariant(evm, "full-board")
  const minimalBoard = getTiEvmVariant(evm, "minimal-board")
  const [fullCircuit, minimalCircuit] = await Promise.all([
    readPrebuiltCircuitJson(fullBoard.circuitJsonUrl),
    readPrebuiltCircuitJson(minimalBoard.circuitJsonUrl),
  ])
  const fullOutline = fullCircuit.find((element) => element.type === "pcb_board")
  const minimalOutline = minimalCircuit.find((element) => element.type === "pcb_board")
  if (!fullOutline || !minimalOutline) throw new Error(`Missing board outline for ${evmId}`)
  expect(minimalOutline.outline).toEqual(fullOutline.outline)
  expect(minimalOutline.center).toEqual(fullOutline.center)
  expect(minimalOutline.width).toBe(fullOutline.width)
  expect(minimalOutline.height).toBe(fullOutline.height)

  const minimalComponentNames = getComponentNames(minimalCircuit)
  const schematicComponentNames = getComponentNames(
    (
      await Promise.all(
        getTiEvmVariantSchematicCircuitJsonUrls(minimalBoard).map(readPrebuiltCircuitJson),
      )
    ).flat(),
  )

  for (const componentName of retainedComponents) {
    expect(minimalComponentNames.has(componentName), componentName).toBe(true)
    expect(schematicComponentNames.has(componentName), componentName).toBe(true)
  }
  for (const componentName of omittedComponents) {
    expect(minimalComponentNames.has(componentName), componentName).toBe(false)
    expect(schematicComponentNames.has(componentName), componentName).toBe(false)
  }

  const connectivity = getFullConnectivityMapFromCircuitJson(minimalCircuit)
  const componentNameById = new Map<SourceComponentId, string>()
  const componentIdByPortId = new Map<SourcePortId, SourceComponentId>()
  const pcbPortSourceIds = new Set<SourcePortId>()
  for (const element of minimalCircuit) {
    if (element.type === "source_component" && typeof element.source_component_id === "string") {
      if (typeof element.name === "string") {
        componentNameById.set(element.source_component_id, element.name)
      }
    }
    if (
      element.type === "source_port" &&
      typeof element.source_port_id === "string" &&
      typeof element.source_component_id === "string"
    ) {
      componentIdByPortId.set(element.source_port_id, element.source_component_id)
    }
    if (element.type === "pcb_port" && typeof element.source_port_id === "string") {
      pcbPortSourceIds.add(element.source_port_id)
    }
  }

  for (const [netName, requiredComponents] of Object.entries(requiredNetMembers)) {
    const net = minimalCircuit.find(
      (element) => element.type === "source_net" && element.name === netName,
    )
    if (typeof net?.source_net_id !== "string") throw new Error(`Missing boot net ${netName}`)
    const connectedIds = connectivity.getIdsConnectedToNet(
      connectivity.getNetConnectedToId(net.source_net_id) ?? net.source_net_id,
    )
    const connectedComponents = connectedIds.flatMap((id) => {
      const componentId = componentIdByPortId.get(id)
      return componentId && pcbPortSourceIds.has(id) ? [componentNameById.get(componentId)] : []
    })
    expect(connectedComponents, netName).toEqual(expect.arrayContaining(requiredComponents))
    expect(
      connectedIds.some((id) => id.startsWith("pcb_trace_")) ||
        minimalCircuit.some(
          (element) =>
            element.type === "pcb_copper_pour" && element.source_net_id === net.source_net_id,
        ),
      `Missing routed copper on ${netName}`,
    ).toBe(true)
  }
}

function getComponentNames(circuitJson: Awaited<ReturnType<typeof readPrebuiltCircuitJson>>) {
  return new Set(
    circuitJson.flatMap((element) =>
      element.type === "source_component" && typeof element.name === "string" ? [element.name] : [],
    ),
  )
}

async function readPrebuiltCircuitJson(publicUrl: string) {
  const path = resolve(import.meta.dir, "../../public", publicUrl.replace(/^\//u, ""))
  return parsePrebuiltCircuitJson(await Bun.file(path).bytes())
}
