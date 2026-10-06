import type { AnyCircuitElement } from "circuit-json"

type PcbCopperPour = AnyCircuitElement & {
  type: "pcb_copper_pour"
  source_net_id?: string
}
type SourceNet = AnyCircuitElement & {
  type: "source_net"
  source_net_id: string
  name: string
}
type SourceNetId = SourceNet["source_net_id"]
type SourceNetName = SourceNet["name"]

export function materializeImportedCopperPours(params: {
  renderedCircuitJson: AnyCircuitElement[]
  sourceCircuitJson: AnyCircuitElement[]
  sourceNetNamesToImport?: ReadonlySet<SourceNetName>
}): AnyCircuitElement[] {
  const sourceNetNamesById = new Map<SourceNetId, SourceNetName>(
    params.sourceCircuitJson
      .filter(isSourceNet)
      .map((sourceNet) => [sourceNet.source_net_id, sourceNet.name]),
  )
  const renderedNetIdsByName = new Map<SourceNetName, SourceNetId>(
    params.renderedCircuitJson
      .filter(isSourceNet)
      .map((sourceNet) => [sourceNet.name, sourceNet.source_net_id]),
  )
  const sourceNetsById = new Map<SourceNetId, SourceNet>(
    params.sourceCircuitJson
      .filter(isSourceNet)
      .map((sourceNet) => [sourceNet.source_net_id, sourceNet]),
  )
  const usedSourceNetIds = new Set(
    params.renderedCircuitJson.filter(isSourceNet).map((sourceNet) => sourceNet.source_net_id),
  )
  const importedSourceNets: SourceNet[] = []
  const importedCopperPours = params.sourceCircuitJson
    .filter(isPcbCopperPour)
    .flatMap((copperPour) => {
      const { source_net_id: sourceNetId, ...copperPourWithoutNet } = structuredClone(copperPour)
      if (!sourceNetId) return [copperPourWithoutNet]

      const sourceNetName = sourceNetNamesById.get(sourceNetId)
      if (!sourceNetName) return []
      let renderedNetId = renderedNetIdsByName.get(sourceNetName)
      if (!renderedNetId) {
        if (!params.sourceNetNamesToImport?.has(sourceNetName)) return []
        const sourceNet = sourceNetsById.get(sourceNetId)
        if (!sourceNet) return []
        renderedNetId = sourceNet.source_net_id
        let duplicateIndex = 1
        while (usedSourceNetIds.has(renderedNetId)) {
          renderedNetId = `${sourceNet.source_net_id}_imported_${duplicateIndex}`
          duplicateIndex += 1
        }
        usedSourceNetIds.add(renderedNetId)
        renderedNetIdsByName.set(sourceNetName, renderedNetId)
        importedSourceNets.push({
          ...structuredClone(sourceNet),
          source_net_id: renderedNetId,
        })
      }
      return renderedNetId ? [{ ...copperPourWithoutNet, source_net_id: renderedNetId }] : []
    })

  return [
    ...params.renderedCircuitJson.filter((element) => !isPcbCopperPour(element)),
    ...importedSourceNets,
    ...importedCopperPours,
  ] as AnyCircuitElement[]
}

function isPcbCopperPour(element: AnyCircuitElement): element is PcbCopperPour {
  return element.type === "pcb_copper_pour"
}

function isSourceNet(element: AnyCircuitElement): element is SourceNet {
  return element.type === "source_net"
}
