import type {
  CadModelComponentIdentity,
  CadModelPlanarOffsetMillimeters,
  CadModelReplacement,
} from "./get-cad-model-replacement"
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
import {
  createMikroBusSocketCadModel,
  createSmdPinHeaderCadModel,
} from "./create-pin-header-cad-models"

// The imported body marks the 5.72 mm section on the PCB. Offset the 15.8 mm
// shell by half the depth difference so both rear edges remain aligned.
const beaglePlayUsbAModelCenterOffsetMillimeters = 5.04
// The imported USB_A_SH body marks the connector's 5.25 mm rear section.
// Move the complete 15.8 mm shell outward so their rear edges stay aligned.
const beagleBoneBlackUsbAModelCenterOffsetMillimeters = 5.275

function createJscadReplacement(
  jscadOperations: Extract<CadModelReplacement, { kind: "jscad" }>["jscadOperations"],
  options: {
    modelPlanarOffsetMillimeters?: CadModelPlanarOffsetMillimeters
    modelYawOffsetDegrees?: number
  } = {},
): CadModelReplacement {
  return { kind: "jscad", jscadOperations, ...options }
}

function getMicroSdModelYawOffsetDegrees(footprint: string): number {
  if (footprint.startsWith("MICRO_SD_")) return 90
  return 0
}

function createBeaglePlayUsbAConnectorCadModel() {
  return createUsbAConnectorCadModel()
}

function createBeagleBoneBlackUsbAConnectorCadModel() {
  return createUsbAConnectorCadModel()
}

export function getMechanicalConnectorCadModelReplacement(
  componentIdentity: CadModelComponentIdentity,
): CadModelReplacement | undefined {
  const footprint = componentIdentity.altiumFootprint.toUpperCase()
  const partNumber = componentIdentity.manufacturerPartNumber?.toUpperCase() ?? ""

  if (footprint === "HEADER10X2_SMD" || footprint.includes("FTR-110-51-D-06")) {
    return createJscadReplacement(
      createSmdPinHeaderCadModel({ columnCount: 10, pitch: 1.27, rowCount: 2 }),
    )
  }
  if (footprint.includes("54202-T0805ALF")) {
    return createJscadReplacement(
      createSmdPinHeaderCadModel({ columnCount: 5, pitch: 2, rowCount: 2 }),
    )
  }
  if (footprint.includes("TSM-104-02-SV")) {
    return createJscadReplacement(
      createSmdPinHeaderCadModel({ columnCount: 4, pitch: 2.54, rowCount: 1 }),
    )
  }
  if (footprint.includes("TSM-105-01-T-TM")) {
    return createJscadReplacement(
      createSmdPinHeaderCadModel({ columnCount: 5, pitch: 2.54, rowCount: 3 }),
    )
  }
  if (footprint.startsWith("MIKROBUS16_")) {
    return createJscadReplacement(createMikroBusSocketCadModel())
  }

  if (footprint === "USB_A_SH") {
    return createJscadReplacement(createBeagleBoneBlackUsbAConnectorCadModel(), {
      modelPlanarOffsetMillimeters: {
        x: 0,
        y: -beagleBoneBlackUsbAModelCenterOffsetMillimeters,
      },
    })
  }
  if (footprint.includes("629104151") || partNumber.startsWith("629104151")) {
    return createJscadReplacement(createUsbAConnectorCadModel())
  }
  if (footprint.startsWith("USB7P_")) {
    return createJscadReplacement(createBeaglePlayUsbAConnectorCadModel(), {
      modelPlanarOffsetMillimeters: {
        x: 0,
        y: -beaglePlayUsbAModelCenterOffsetMillimeters,
      },
      modelYawOffsetDegrees: -90,
    })
  }
  if (
    footprint.includes("629105150521") ||
    footprint.includes("MUSBB5") ||
    partNumber === "629105150521"
  ) {
    return createJscadReplacement(createMicroUsbConnectorCadModel())
  }
  if (footprint.includes("USB5MINI") || footprint.includes("ST-USB-117")) {
    return createJscadReplacement(createMiniUsbConnectorCadModel(), {
      modelYawOffsetDegrees: -90,
    })
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
    return createJscadReplacement(createMicroSdConnectorCadModel(), {
      modelYawOffsetDegrees: getMicroSdModelYawOffsetDegrees(footprint),
    })
  }
  if (footprint.includes("U-FL") || partNumber.startsWith("U.FL-R-SMT")) {
    return createJscadReplacement(createUflConnectorCadModel())
  }
  if (footprint.includes("SJ-43514")) {
    return createJscadReplacement(createAudioJackCadModel())
  }
  if (footprint.includes("PJ102A")) {
    return createJscadReplacement(createBarrelJackCadModel(), {
      modelYawOffsetDegrees: 90,
    })
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
    const modelYawOffsetDegrees = footprint === "USB2_0_TYPE_C" ? -90 : 0
    return createJscadReplacement(createUsbCConnectorCadModel(), {
      modelYawOffsetDegrees,
    })
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
    const modelYawOffsetDegrees = footprint.includes("_90D") ? 180 : 0
    return createJscadReplacement(createJstConnectorCadModel({ pinCount: 4, pitch }), {
      modelYawOffsetDegrees,
    })
  }
  if (footprint.startsWith("CONNECT10_")) {
    return createJscadReplacement(createFpcConnectorCadModel({ pinCount: 10, pitch: 1.27 }))
  }
  if (footprint.includes("501331-0307")) {
    return createJscadReplacement(createJstConnectorCadModel({ pinCount: 3, pitch: 1.25 }))
  }
  return undefined
}
