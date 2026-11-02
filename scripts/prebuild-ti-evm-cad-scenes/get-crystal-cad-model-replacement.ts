import type { CadModelComponentIdentity, CadModelReplacement } from "./get-cad-model-replacement"
import type { ModelLocalPad } from "./get-model-local-pads"
import { alignTwoTerminalCadModel } from "./align-two-terminal-cad-model"
import { createMetalCanCadModel } from "./create-dimensioned-package-cad-models"
import { createSmtPadCadContact } from "./create-smt-pad-cad-contact"
import { connectorModelColors, createColoredRoundedCuboid } from "./jscad-model-primitives"

export function getCrystalCadModelReplacement(
  componentIdentity: CadModelComponentIdentity,
  modelLocalPads: ModelLocalPad[],
): CadModelReplacement | undefined {
  const footprint = componentIdentity.altiumFootprint.toUpperCase()
  if (footprint === "XTAL4_126-216SMD") {
    // BBB Y1 is Citizen CM200C: 7.9 x 3.7 x 2.5 mm plastic, four SOJ terminals.
    // The footprint's 126-216 token describes the lands, not the package body.
    return {
      kind: "jscad",
      jscadOperations: [
        createColoredRoundedCuboid({
          center: [0, 0, 1.3],
          size: [7.9, 3.7, 2.4],
          roundRadius: 0.15,
          color: connectorModelColors.blackPlastic,
        }),
        ...modelLocalPads.map((pad) => createSmtPadCadContact(pad, connectorModelColors.metal)),
      ],
    }
  }
  if (footprint !== "XTAL150SMD_125X196") return undefined
  // The BBB schematic identifies Y2 as TXC 7A (1.35 mm) and Y3 as Abracon
  // ABM3 (1.3 mm). Both use a 5 x 3.2 mm body, along the two-terminal axis.
  let height = 1.3
  if (componentIdentity.componentName === "Y2") height = 1.35
  let body = createMetalCanCadModel({ length: 5, width: 3.2, height })
  let terminalColor = connectorModelColors.metal
  if (componentIdentity.componentName === "Y2") {
    // TXC 7A uses a black glass-sealed case, not the ABM3's metal lid.
    body = [
      createColoredRoundedCuboid({
        center: [0, 0, (height + 0.1) / 2],
        size: [5, 3.2, height - 0.1],
        roundRadius: 0.12,
        color: connectorModelColors.blackPlastic,
      }),
    ]
    terminalColor = connectorModelColors.gold
  }
  return {
    kind: "jscad",
    jscadOperations: [
      ...alignTwoTerminalCadModel({
        jscadOperations: body,
        modelLocalPads,
      }),
      ...modelLocalPads.map((pad) => createSmtPadCadContact(pad, terminalColor)),
    ],
  }
}
