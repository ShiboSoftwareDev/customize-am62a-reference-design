import type { AnyCircuitElement } from "circuit-json"

type SourcePortId = string
export type ReferencePinName = string

export function getComponentReferencePinIds({
  circuitJson,
  referenceCircuitJson,
  componentName,
}: {
  circuitJson: AnyCircuitElement[]
  referenceCircuitJson: AnyCircuitElement[]
  componentName: string
}): Map<ReferencePinName, SourcePortId[]> {
  const referenceComponent = referenceCircuitJson.find(
    (element) => element.type === "source_component" && element.name === componentName,
  )
  const component = circuitJson.find(
    (element) => element.type === "source_component" && element.name === componentName,
  )
  if (!referenceComponent || !component) throw new Error(`Missing ${componentName}`)
  const referencePins = referenceCircuitJson.filter(
    (element) =>
      element.type === "source_port" &&
      element.source_component_id === referenceComponent.source_component_id,
  )
  const componentPortIds = new Set(
    circuitJson.flatMap((element) =>
      element.type === "source_port" &&
      element.source_component_id === component.source_component_id &&
      typeof element.source_port_id === "string"
        ? [element.source_port_id]
        : [],
    ),
  )
  const pinIdsByReferenceName = new Map<ReferencePinName, SourcePortId[]>()
  for (const referencePin of referencePins) {
    if (typeof referencePin.name !== "string") continue
    const referencePort = referenceCircuitJson.find(
      (element) =>
        element.type === "pcb_port" && element.source_port_id === referencePin.source_port_id,
    )
    if (!referencePort) continue
    const port = circuitJson.find(
      (element) =>
        element.type === "pcb_port" &&
        typeof element.source_port_id === "string" &&
        componentPortIds.has(element.source_port_id) &&
        typeof element.x === "number" &&
        typeof element.y === "number" &&
        typeof referencePort.x === "number" &&
        typeof referencePort.y === "number" &&
        Math.hypot(element.x - referencePort.x, element.y - referencePort.y) < 0.00001,
    )
    if (!port || typeof port.source_port_id !== "string")
      throw new Error(`Missing ${componentName}.${referencePin.name} at its reference position`)
    const pinIds = pinIdsByReferenceName.get(referencePin.name) ?? []
    if (!pinIds.includes(port.source_port_id)) pinIds.push(port.source_port_id)
    pinIdsByReferenceName.set(referencePin.name, pinIds)
  }
  return pinIdsByReferenceName
}
