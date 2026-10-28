import type { CadModelComponentIdentity, CadModelReplacement } from "./get-cad-model-replacement"
import {
  createBoxHeaderCadModel,
  createFpcConnectorCadModel,
  createJstConnectorCadModel,
  createM2SocketCadModel,
  createRj45ConnectorCadModel,
} from "./create-additional-connector-cad-models"
import {
  createAudioJackCadModel,
  createBarrelJackCadModel,
  createCoinCellHolderCadModel,
  createMicroSdConnectorCadModel,
  createRj11ConnectorCadModel,
  createUflConnectorCadModel,
} from "./create-board-connector-cad-models"
import {
  createHdmiAConnectorCadModel,
  createMicroHdmiConnectorCadModel,
} from "./create-hdmi-connector-cad-model"
import {
  createMicroUsbConnectorCadModel,
  createMiniUsbConnectorCadModel,
  createUsbAConnectorCadModel,
  createUsbCConnectorCadModel,
} from "./create-usb-connector-cad-model"

function createJscadReplacement(
  jscadOperations: Extract<CadModelReplacement, { kind: "jscad" }>["jscadOperations"],
): CadModelReplacement {
  return { kind: "jscad", jscadOperations }
}

export function getMechanicalConnectorCadModelReplacement(
  componentIdentity: CadModelComponentIdentity,
): CadModelReplacement | undefined {
  const footprint = componentIdentity.altiumFootprint.toUpperCase()
  const partNumber = componentIdentity.manufacturerPartNumber?.toUpperCase() ?? ""

  if (
    footprint.includes("629104151") ||
    footprint === "USB_A_SH" ||
    footprint.startsWith("USB7P_") ||
    partNumber.startsWith("629104151")
  ) {
    return createJscadReplacement(createUsbAConnectorCadModel())
  }
  if (
    footprint.includes("629105150521") ||
    footprint.includes("MUSBB5") ||
    partNumber === "629105150521"
  ) {
    return createJscadReplacement(createMicroUsbConnectorCadModel())
  }
  if (footprint.includes("USB5MINI") || footprint.includes("ST-USB-117")) {
    return createJscadReplacement(createMiniUsbConnectorCadModel())
  }
  if (footprint.includes("10029449") || footprint.includes("HDMI19P")) {
    return createJscadReplacement(createHdmiAConnectorCadModel())
  }
  if (footprint.includes("DC04S019")) {
    return createJscadReplacement(createHdmiAConnectorCadModel())
  }
  if (footprint.includes("CONN19_HDMI")) {
    return createJscadReplacement(createMicroHdmiConnectorCadModel())
  }
  if (
    footprint.includes("MEM2051") ||
    footprint.includes("MICRO_SD") ||
    footprint.includes("SD-MICRO")
  ) {
    return createJscadReplacement(createMicroSdConnectorCadModel())
  }
  if (footprint.includes("U-FL") || partNumber.startsWith("U.FL-R-SMT")) {
    return createJscadReplacement(createUflConnectorCadModel())
  }
  if (footprint.includes("SJ-43514")) {
    return createJscadReplacement(createAudioJackCadModel())
  }
  if (footprint.includes("PJ102A")) {
    return createJscadReplacement(createBarrelJackCadModel())
  }
  if (footprint === "BAT-CR1220") {
    return createJscadReplacement(createCoinCellHolderCadModel())
  }
  if (footprint.startsWith("RJ11_")) {
    return createJscadReplacement(createRj11ConnectorCadModel())
  }
  if (footprint.includes("LPJG16314A4NL") || partNumber === "LPJG16314A4NL") {
    return createJscadReplacement(
      createRj45ConnectorCadModel({ depth: 21.25, height: 13.6, width: 15.95 }),
    )
  }
  if (footprint === "RJ45_18P_21_23X15_93X13_3MM") {
    return createJscadReplacement(
      createRj45ConnectorCadModel({ depth: 21.23, height: 13.3, width: 15.93 }),
    )
  }
  if (footprint === "RJ45-7499010211A") {
    return createJscadReplacement(
      createRj45ConnectorCadModel({ depth: 21.25, height: 13.6, width: 16 }),
    )
  }
  if (
    footprint.includes("2012670") ||
    footprint === "USB2_0_TYPE_C" ||
    partNumber === "2012670005"
  ) {
    return createJscadReplacement(createUsbCConnectorCadModel())
  }
  if (footprint.includes("2199119")) {
    return createJscadReplacement(createM2SocketCadModel())
  }
  if (footprint.includes("3020-14")) {
    return createJscadReplacement(
      createBoxHeaderCadModel({ columnCount: 7, pitch: 2.54, rowCount: 2 }),
    )
  }
  if (footprint.includes("5019512230")) {
    return createJscadReplacement(createFpcConnectorCadModel({ pinCount: 22, pitch: 0.5 }))
  }
  const genericFpcPinCount = /^FPC(\d+)_0D5/u.exec(footprint)?.[1]
  if (genericFpcPinCount) {
    return createJscadReplacement(
      createFpcConnectorCadModel({ pinCount: Number(genericFpcPinCount), pitch: 0.5 }),
    )
  }
  if (footprint.includes("FH12A") || footprint.includes("FFC2A32-40")) {
    return createJscadReplacement(createFpcConnectorCadModel({ pinCount: 40, pitch: 0.5 }))
  }
  if (footprint.includes("1734248-5")) {
    return createJscadReplacement(createFpcConnectorCadModel({ pinCount: 15, pitch: 0.5 }))
  }
  if (footprint.startsWith("JST4P_")) {
    const pitch = footprint.includes("_1D0_") ? 1 : 2
    return createJscadReplacement(createJstConnectorCadModel({ pinCount: 4, pitch }))
  }
  if (footprint.startsWith("CONNECT10_")) {
    return createJscadReplacement(createFpcConnectorCadModel({ pinCount: 10, pitch: 1.27 }))
  }
  if (footprint.includes("501331-0307")) {
    return createJscadReplacement(createJstConnectorCadModel({ pinCount: 3, pitch: 1.25 }))
  }
  return undefined
}
