import type { AnyCircuitElement } from "circuit-json"
import { applyToPoint, compose, rotateDEG, translate } from "transformation-matrix"

type CircuitPoint = { x: number; y: number }
type PcbCopperPour = AnyCircuitElement & {
  type: "pcb_copper_pour"
  center?: CircuitPoint
  covered_with_solder_mask?: boolean
  height?: number
  layer: string
  points?: CircuitPoint[]
  rotation?: number
  shape: string
  source_net_id?: string
  width?: number
}
type SourceNet = AnyCircuitElement & {
  type: "source_net"
  source_net_id: string
  name: string
}
type SourceNetId = SourceNet["source_net_id"]
type SourceNetName = SourceNet["name"]

export type SupportedCopperPour = {
  coveredWithSolderMask: boolean
  layer: string
  outline: CircuitPoint[]
  sourceNetName: SourceNetName
}

export function getSupportedCopperPours(params: {
  circuitJson: AnyCircuitElement[]
}): SupportedCopperPour[] {
  const sourceNetNamesById = new Map<SourceNetId, SourceNetName>(
    params.circuitJson
      .filter((element): element is SourceNet => element.type === "source_net")
      .map((sourceNet) => [sourceNet.source_net_id, sourceNet.name]),
  )

  return params.circuitJson
    .filter((element): element is PcbCopperPour => element.type === "pcb_copper_pour")
    .flatMap((copperPour) => {
      if (!copperPour.source_net_id) return []
      const sourceNetName = sourceNetNamesById.get(copperPour.source_net_id)
      if (!sourceNetName) return []
      const outline = getSupportedOutline(copperPour)
      if (!outline) return []

      return [
        {
          coveredWithSolderMask: copperPour.covered_with_solder_mask ?? true,
          layer: copperPour.layer,
          outline,
          sourceNetName,
        },
      ]
    })
}

function getSupportedOutline(copperPour: PcbCopperPour): CircuitPoint[] | undefined {
  if (copperPour.shape === "polygon") return copperPour.points
  if (copperPour.shape !== "rect") return undefined
  if (!copperPour.center || copperPour.width === undefined || copperPour.height === undefined) {
    return undefined
  }

  const halfWidth = copperPour.width / 2
  const halfHeight = copperPour.height / 2
  const transform = compose(
    translate(copperPour.center.x, copperPour.center.y),
    rotateDEG(copperPour.rotation ?? 0),
  )
  return [
    { x: -halfWidth, y: -halfHeight },
    { x: halfWidth, y: -halfHeight },
    { x: halfWidth, y: halfHeight },
    { x: -halfWidth, y: halfHeight },
  ].map((point) => applyToPoint(transform, point))
}
