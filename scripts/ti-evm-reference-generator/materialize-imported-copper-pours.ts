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

export function materializeImportedCopperPours(params: {
  renderedCircuitJson: AnyCircuitElement[]
  sourceCircuitJson: AnyCircuitElement[]
}): AnyCircuitElement[] {
  const sourceNetsById = new Map(
    params.sourceCircuitJson
      .filter(isSourceNet)
      .map((sourceNet) => [sourceNet.source_net_id, sourceNet]),
  )
  const renderedNetIdsByName = new Map(
    params.renderedCircuitJson
      .filter(isSourceNet)
      .map((sourceNet) => [sourceNet.name, sourceNet.source_net_id]),
  )
  const importedCopperPours = params.sourceCircuitJson.filter(isPcbCopperPour).map((copperPour) => {
    const { source_net_id: sourceNetId, ...copperPourWithoutNet } = structuredClone(copperPour)
    const sourceNetName = sourceNetId ? sourceNetsById.get(sourceNetId)?.name : undefined
    const renderedNetId = sourceNetName ? renderedNetIdsByName.get(sourceNetName) : undefined

    return renderedNetId
      ? { ...copperPourWithoutNet, source_net_id: renderedNetId }
      : copperPourWithoutNet
  })

  return [
    ...params.renderedCircuitJson.filter((element) => !isPcbCopperPour(element)),
    ...importedCopperPours,
  ] as AnyCircuitElement[]
}

function isPcbCopperPour(element: AnyCircuitElement): element is PcbCopperPour {
  return element.type === "pcb_copper_pour"
}

function isSourceNet(element: AnyCircuitElement): element is SourceNet {
  return element.type === "source_net"
}
