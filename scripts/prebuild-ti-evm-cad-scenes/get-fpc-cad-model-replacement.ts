import type { CadModelComponentIdentity, CadModelReplacement } from "./get-cad-model-replacement"
import type { ModelLocalPad } from "./get-model-local-pads"
import { createFpcConnectorCadModel } from "./create-additional-connector-cad-models"
import { createVerticalFpcCadModel } from "./create-vertical-fpc-cad-model"
import { connectorModelColors } from "./jscad-model-primitives"
import { getPackageBodyDimensionsMillimeters } from "./get-package-body-dimensions"

export function getFpcCadModelReplacement(
  componentIdentity: CadModelComponentIdentity,
  modelLocalPads: ModelLocalPad[],
): CadModelReplacement | undefined {
  const footprint = componentIdentity.altiumFootprint.toUpperCase()
  // TE 1-1734248-5: 15 positions, 1 mm pitch, vertical, 22.4 x 4.6 x 7.7 mm.
  if (footprint.includes("1-1734248-5")) {
    return {
      kind: "jscad",
      jscadOperations: createVerticalFpcCadModel({
        width: 22.4,
        depth: 4.6,
        height: 7.7,
        pinCount: 15,
        pitch: 1,
        housingColor: connectorModelColors.blackPlastic,
        modelLocalPads,
      }),
    }
  }
  // GCT FFC2A32 and Molex 501951 are top-entry connectors, not FH12-style slots.
  if (footprint.includes("FFC2A32-40") || footprint.includes("5019512230")) {
    const isGctConnector = footprint.includes("FFC2A32-40")
    return {
      kind: "jscad",
      jscadOperations: createVerticalFpcCadModel({
        width: isGctConnector ? 27.4 : 13.4,
        depth: isGctConnector ? 3.3 : 4.5,
        height: isGctConnector ? 4.25 : 4.05,
        pinCount: isGctConnector ? 40 : 22,
        pitch: 0.5,
        housingColor: connectorModelColors.whitePlastic,
        modelLocalPads,
      }),
    }
  }
  if (footprint.includes("FH12A-40") || footprint.startsWith("CON_FLEX40X1_FH12A_")) {
    return {
      kind: "jscad",
      jscadOperations: createFpcConnectorCadModel({
        pinCount: 40,
        pitch: 0.5,
        bodySize: { width: 24.5, depth: 7, height: 2 },
        modelLocalPads,
      }),
    }
  }
  const beaglePlayFpcPinCount = /^FPC(22|40)_0D5/u.exec(footprint)?.[1]
  const bodyDimensions = getPackageBodyDimensionsMillimeters(footprint)
  if (!beaglePlayFpcPinCount || !bodyDimensions) return undefined
  const pinCount = Number(beaglePlayFpcPinCount)
  return {
    kind: "jscad",
    jscadOperations: createFpcConnectorCadModel({
      pinCount,
      pitch: 0.5,
      bodySize: { width: bodyDimensions.x, depth: bodyDimensions.y, height: 2 },
      modelLocalPads,
    }),
  }
}
