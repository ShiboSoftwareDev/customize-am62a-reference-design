import type { AnyCircuitElement } from "circuit-json"

export function canHideOutsideBoard(element: AnyCircuitElement): boolean {
  if (
    element.type === "pcb_cutout" ||
    element.type === "pcb_copper_text" ||
    element.type.startsWith("pcb_silkscreen_") ||
    element.type.startsWith("pcb_fabrication_note_")
  )
    return true

  // Unassigned tracks outside the board can be Altium fabrication legends.
  return (
    element.type === "pcb_trace" &&
    !element.source_net_id &&
    !element.source_trace_id &&
    !element.is_antenna_trace &&
    Array.isArray(element.route) &&
    element.route.every(
      (point) => point.route_type === "wire" && !point.start_pcb_port_id && !point.end_pcb_port_id,
    )
  )
}
