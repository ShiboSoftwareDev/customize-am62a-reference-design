import type { CadModelComponentIdentity, CadModelReplacement } from "./get-cad-model-replacement"
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
  if (
    footprint.includes("2012670") ||
    footprint === "USB2_0_TYPE_C" ||
    partNumber === "2012670005"
  ) {
    return { kind: "footprinter", footprinterString: "usbcmidmount16" }
  }
  return undefined
}
