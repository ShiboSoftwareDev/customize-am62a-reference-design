import type { JscadOperation } from "jscad-planner"
import type { CadRegistrationPad } from "./get-pad-registered-model-placement"
import { getModelLocalPads } from "./get-model-local-pads"
import { createSmtPadCadContact } from "./create-smt-pad-cad-contact"
import {
  colorize,
  connectorModelColors,
  createColoredCuboid,
  createColoredCylinder,
  subtract,
  translate,
} from "./jscad-model-primitives"

// Use the final shell datum so pads and holes also follow any connector-specific
// yaw or offset. The local Z=0 plane is the seated PCB surface.
export function addConnectorBoardTerminals({
  operations,
  pads,
  position,
  rotation,
  kind,
}: {
  operations: JscadOperation[]
  pads: CadRegistrationPad[]
  position: { x: number; y: number }
  rotation: { y: number; z: number }
  kind: "through-hole" | "usb-c"
}): JscadOperation[] {
  const layer = rotation.y === 180 ? "bottom" : "top"
  const placement = {
    position,
    layer,
    ccwRotationDegrees: layer === "bottom" ? -rotation.z : rotation.z,
  } as const
  const throughHoleLeads = pads.flatMap((pad) => {
    if (pad.type !== "pcb_plated_hole" || pad.x === undefined || pad.y === undefined) return []
    const width = pad.hole_width ?? pad.hole_diameter ?? 0
    const height = pad.hole_height ?? pad.hole_diameter ?? 0
    if (width <= 0 || height <= 0) return []
    const [localHole] = getModelLocalPads({
      ...placement,
      pads: [
        {
          type: "pcb_smtpad",
          x: pad.x + (pad.hole_offset_x ?? 0),
          y: pad.y + (pad.hole_offset_y ?? 0),
          width,
          height,
          ccw_rotation: pad.hole_ccw_rotation ?? pad.ccw_rotation,
        },
      ],
    })
    if (!localHole) return []
    if (pad.hole_diameter !== undefined) {
      const isLocatingPeg =
        pad.hole_diameter > 2.5 && !pad.port_hints?.some((hint) => /^\d+$/u.test(hint))
      return [
        createColoredCylinder({
          center: [localHole.x, localHole.y, -1.1],
          color: isLocatingPeg ? connectorModelColors.blackPlastic : connectorModelColors.metal,
          height: 2.8,
          radius: pad.hole_diameter * (isLocatingPeg ? 0.43 : 0.31),
        }),
      ]
    }
    return [
      translate([localHole.x, localHole.y, 0], {
        type: "rotate",
        angles: [0, 0, (localHole.ccwRotationDegrees * Math.PI) / 180],
        shape: createColoredCuboid({
          center: [0, 0, -1.1],
          color: connectorModelColors.metal,
          size: [width * 0.6, height * 0.6, 2.8],
        }),
      }),
    ]
  })
  if (kind !== "usb-c") return [...operations, ...throughHoleLeads]

  const solderTails = pads.flatMap((pad) => {
    const [localPad] = getModelLocalPads({ ...placement, pads: [pad] })
    if (!localPad) return []
    const isShield = pad.port_hints?.some((hint) => /^S(?:H)?\d+$/u.test(hint))
    return [
      createSmtPadCadContact(
        localPad,
        isShield ? connectorModelColors.metal : connectorModelColors.gold,
      ),
    ]
  })
  const [shell, ...interior] = operations
  if (!shell || solderTails.length === 0) return [...operations, ...throughHoleLeads]
  return [
    colorize(connectorModelColors.metal, subtract([shell, ...solderTails])),
    ...interior,
    ...solderTails,
    ...throughHoleLeads,
  ]
}
