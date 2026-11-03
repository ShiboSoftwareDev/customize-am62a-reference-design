import type {
  CadModelComponentIdentity,
  CadModelPlanarOffsetMillimeters,
  CadModelReplacement,
} from "./get-cad-model-replacement"
import {
  createBoxHeaderCadModel,
  createFpcConnectorCadModel,
  createJstConnectorCadModel,
  createRj45ConnectorCadModel,
} from "./create-additional-connector-cad-models"
import {
  barrelJackPinPositions,
  createBarrelJackCadModel,
  createCoinCellHolderCadModel,
  createRj11ConnectorCadModel,
  createUflConnectorCadModel,
  rj11PinPositions,
} from "./create-board-connector-cad-models"
import {
  createMiniUsbConnectorCadModel,
  createUsbAConnectorCadModel,
  createUsbCConnectorCadModel,
} from "./create-usb-connector-cad-model"
import {
  createMikroBusSocketCadModel,
  createMixedMountPinHeaderCadModel,
  mikroBusSmtPinPositions,
} from "./create-pin-header-cad-models"
import {
  createFciMicroHdmiConnectorCadModel,
  createJaeHdmiConnectorCadModel,
  fciMicroHdmiSignalPinPositions,
  jaeHdmiSignalPinPositions,
} from "./create-hdmi-connector-cad-model"
import { externalGlbModelUrls, externalStepModelUrls } from "./external-cad-model-urls"
import { createGroveSmdConnectorCadModel } from "./create-grove-smd-connector-cad-model"
import { createKeyedDebugHeaderCadModel } from "./create-keyed-debug-header-cad-model"

// The imported USB_A_SH body marks the connector's 5.25 mm rear section.
// Move the complete 15.8 mm shell outward so their rear edges stay aligned.
const beagleBoneBlackUsbAModelCenterOffsetMillimeters = 5.275
// Ultra Librarian's manufacturer model uses meters and retains TE's CAD origin.
// The model is inverted. Its solder tails are at -1.71 mm after flipping Z;
// the locating pegs extend another 0.525 mm into the PCB.
const te2199119_4ModelCenterOffsetMillimeters = -4
const te2199119_4ModelBottomOffsetMillimeters = 1.71

function createJscadReplacement(
  jscadOperations: Extract<CadModelReplacement, { kind: "jscad" }>["jscadOperations"],
  options: {
    modelPlanarOffsetMillimeters?: CadModelPlanarOffsetMillimeters
    modelYawOffsetDegrees?: number
    boardTerminals?: "through-hole" | "usb-c"
  } = {},
): CadModelReplacement {
  return { kind: "jscad", jscadOperations, ...options }
}

function createStepReplacement(
  modelStepUrl: string,
  options: {
    modelPlanarOffsetMillimeters?: CadModelPlanarOffsetMillimeters
    modelYawOffsetDegrees?: number
  } = {},
): CadModelReplacement {
  return { kind: "step", modelStepUrl, ...options }
}

function createGlbReplacement(
  modelGlbUrl: string,
  options: {
    modelPlanarOffsetMillimeters?: CadModelPlanarOffsetMillimeters
    modelUnitToMmScaleFactor: number
    modelBoardNormalDirection?: "z+" | "z-"
    modelVerticalOffsetMillimeters?: number
    modelYawOffsetDegrees?: number
  },
): CadModelReplacement {
  return { kind: "glb", modelGlbUrl, ...options }
}

export function getMechanicalConnectorCadModelReplacement(
  componentIdentity: CadModelComponentIdentity,
): CadModelReplacement | undefined {
  const footprint = componentIdentity.altiumFootprint.toUpperCase()
  const partNumber = componentIdentity.manufacturerPartNumber?.toUpperCase() ?? ""

  if (footprint.includes("FTR-110-51-D-06")) {
    return createJscadReplacement(createKeyedDebugHeaderCadModel())
  }
  if (footprint === "HEADER10X2_SMD") {
    // KiCad numbers contacts along local -Y; the TI footprint uses local +X.
    return createStepReplacement(externalStepModelUrls.pinHeader2x10P1_27Smd, {
      modelYawOffsetDegrees: 90,
    })
  }
  if (footprint.includes("PREC010DAAN")) {
    // KiCad's origin is pin 1. Its contact-array center is (1.27, -11.43) mm.
    return createStepReplacement(externalStepModelUrls.pinHeader2x10P2_54ThroughHole, {
      modelPlanarOffsetMillimeters: { x: -1.27, y: 11.43 },
      modelYawOffsetDegrees: 90,
    })
  }
  if (footprint.includes("54202-T0805ALF")) {
    return createStepReplacement(externalStepModelUrls.pinHeader2x05P2_54Smd, {
      modelYawOffsetDegrees: 90,
    })
  }
  if (footprint.includes("TSM-104-02-SV")) {
    // The TI footprint alternates its solder tails with pin 1 on local -Y.
    return createStepReplacement(externalStepModelUrls.pinHeader1x04P2_54Smd, {
      modelYawOffsetDegrees: -90,
    })
  }
  if (footprint.includes("TSM-105-01-T-TM")) {
    return createJscadReplacement(createMixedMountPinHeaderCadModel())
  }
  if (footprint.startsWith("MIKROBUS16_")) {
    return {
      kind: "jscad",
      jscadOperations: createMikroBusSocketCadModel(),
      modelOriginPosition: { x: 0, y: 0, z: 0 },
      modelPinPositions: mikroBusSmtPinPositions,
    }
  }

  if (footprint === "USB_A_SH") {
    return createJscadReplacement(createUsbAConnectorCadModel(), {
      boardTerminals: "through-hole",
      modelPlanarOffsetMillimeters: {
        x: 0,
        y: -beagleBoneBlackUsbAModelCenterOffsetMillimeters,
      },
    })
  }
  if (footprint.includes("629104151") || partNumber.startsWith("629104151")) {
    return {
      kind: "step",
      modelStepUrl: externalStepModelUrls.wurthUsbA,
      modelOriginPosition: { x: 0, y: 0, z: 0 },
      // Wurth's matching footprint puts pins 1-4 on Y=-6.75 mm.
      // Reverse footprint Y into the STEP model's right-handed package frame.
      modelPinPositions: [-3.5, -1, 1, 3.5].map((x, index) => ({
        pinNumber: String(index + 1),
        x,
        y: 6.75,
      })),
    }
  }
  if (footprint === "USB7P_1R4_14X5R72MM") {
    return {
      kind: "glb",
      modelGlbUrl: "/cad-models/beagleplay-usb-a.glb",
      modelOriginPosition: { x: 0, y: 0, z: 0 },
      modelUnitToMmScaleFactor: 1,
      // The prebuilt GLB is Y-up. Register its origin at the signal-pin row.
      modelBoardNormalDirection: "y+",
      modelPinPositions: Array.from({ length: 4 }, (_, index) => ({
        pinNumber: String(index + 1),
        x: 0.01,
        y: 1.4 * (index - 1.5),
      })),
    }
  }
  if (footprint === "HEADER3P_2D54_DIP") {
    return {
      kind: "glb",
      modelGlbUrl: "/cad-models/beagleplay-uart-header.glb",
      modelOriginPosition: { x: 0, y: 0, z: 0 },
      modelUnitToMmScaleFactor: 1,
      modelBoardNormalDirection: "y+",
      modelPinPositions: Array.from({ length: 3 }, (_, index) => ({
        pinNumber: String(index + 1),
        x: 0,
        y: 2.54 * (1 - index),
      })),
    }
  }
  if (
    footprint.includes("629105150521") ||
    footprint.includes("MUSBB5") ||
    partNumber === "629105150521"
  ) {
    return {
      kind: "step",
      modelStepUrl: externalStepModelUrls.wurthMicroUsbB,
      modelOriginPosition: { x: 0, y: 0, z: 0 },
      // The manufacturer's footprint and STEP share the same datum.
      // Numbered solder lands sit on Y=-2.9 mm in the footprint (STEP +Y).
      modelPinPositions: Array.from({ length: 5 }, (_, index) => ({
        pinNumber: String(index + 1),
        x: -1.3 + index * 0.65,
        y: 2.9,
      })),
    }
  }
  if (footprint.includes("USB5MINI") || footprint.includes("ST-USB-117")) {
    return createJscadReplacement(createMiniUsbConnectorCadModel(), {
      modelYawOffsetDegrees: -90,
    })
  }
  if (footprint.startsWith("HDMI19P_1D155_")) {
    return {
      kind: "glb",
      modelGlbUrl: "/cad-models/beagleplay-hdmi.glb",
      modelOriginPosition: { x: 0, y: 0, z: 0 },
      modelUnitToMmScaleFactor: 1,
      // This asset is exported in scene coordinates. Recover the reference
      // package frame before registering its two staggered through-hole rows.
      modelXRotationDegrees: 270,
      modelYawOffsetDegrees: 180,
      modelVerticalOffsetMillimeters: 0.0338,
      modelPinPositions: Array.from({ length: 19 }, (_, index) => ({
        pinNumber: String(index + 1),
        x: index % 2 === 0 ? 0.5 : -0.5,
        y: 1.9159 + index * 0.5775,
      })),
    }
  }
  if (footprint.includes("DC04S019JA1") || partNumber === "DC04S019JA1R600") {
    return {
      kind: "jscad",
      jscadOperations: createJaeHdmiConnectorCadModel(),
      modelOriginPosition: { x: 0, y: 0, z: 0 },
      modelPinPositions: jaeHdmiSignalPinPositions,
    }
  }
  if (footprint.includes("10029449")) {
    return {
      kind: "step",
      modelStepUrl: externalStepModelUrls.amphenolHdmiA,
      modelOriginPosition: { x: 0, y: 0, z: 0 },
      modelPinPositions: Array.from({ length: 19 }, (_, index) => ({
        pinNumber: String(index + 1),
        x: 4.75 - index * 0.5,
        y: 5,
      })),
    }
  }
  if (footprint === "CONN19_HDMI" || partNumber === "10118241-001RLF") {
    return {
      kind: "jscad",
      jscadOperations: createFciMicroHdmiConnectorCadModel(),
      modelOriginPosition: { x: 0, y: 0, z: 0 },
      modelPinPositions: fciMicroHdmiSignalPinPositions,
    }
  }
  if (footprint.includes("U-FL") || partNumber.startsWith("U.FL-R-SMT")) {
    return createJscadReplacement(createUflConnectorCadModel())
  }
  if (footprint.includes("SJ-43514")) {
    return {
      kind: "step",
      modelStepUrl: externalStepModelUrls.cuiSj43514AudioJack,
      // Rotate CUI's Y-up file into the board frame. The numbered
      // solder contacts below are measured in that rotated package frame.
      modelXRotationDegrees: 90,
      modelVerticalOffsetMillimeters: 2.6,
      modelPinPositions: [
        { pinNumber: "1", x: -0.6, y: 3.75 },
        { pinNumber: "2", x: -12.8, y: 3.4 },
        { pinNumber: "3", x: -5.3, y: -3.625 },
        { pinNumber: "4", x: -3.4, y: 3.4 },
      ],
    }
  }
  if (footprint.includes("PJ102A")) {
    return {
      kind: "jscad",
      jscadOperations: createBarrelJackCadModel(),
      modelOriginPosition: { x: 0, y: 0, z: 0 },
      modelPinPositions: barrelJackPinPositions,
    }
  }
  if (footprint === "BAT-CR1220") {
    return {
      kind: "jscad",
      jscadOperations: createCoinCellHolderCadModel(),
      modelOriginPosition: { x: 0, y: 0, z: 0 },
      // The footprint has a 90° component rotation, but its pad row runs along board X.
      modelYawOffsetDegrees: -90,
    }
  }
  if (footprint.startsWith("RJ11_")) {
    return {
      kind: "jscad",
      jscadOperations: createRj11ConnectorCadModel(),
      modelOriginPosition: { x: 0, y: 0, z: 0 },
      modelPinPositions: rj11PinPositions,
    }
  }
  if (footprint.includes("LPJG16314A4NL") || partNumber === "LPJG16314A4NL") {
    return {
      kind: "glb",
      modelGlbUrl: "/cad-models/linkpp-lpjg16314a4nl.glb",
      modelOriginPosition: { x: 0, y: 0, z: 0 },
      modelUnitToMmScaleFactor: 1,
      // LINK-PP's product uses Y for height, with its seated plane at -6.75.
      // The cached asset plus X=0 restores this as board-normal Z.
      modelXRotationDegrees: 0,
      modelYawOffsetDegrees: 180,
      modelVerticalOffsetMillimeters: 6.75,
      modelPinPositions: Array.from({ length: 10 }, (_, index) => ({
        pinNumber: String(index + 1),
        x: -5.715 + index * 1.27,
        y: index % 2 === 0 ? -1.61 : -4.15,
      })),
    }
  }
  if (footprint === "RJ45_18P_21_23X15_93X13_3MM") {
    return createJscadReplacement(
      createRj45ConnectorCadModel({ depth: 21.23, height: 13.3, width: 15.93 }),
      { boardTerminals: "through-hole" },
    )
  }
  if (footprint === "RJ45-7499010211A") {
    return createJscadReplacement(
      createRj45ConnectorCadModel({ depth: 21.25, height: 13.6, width: 16 }),
      { boardTerminals: "through-hole" },
    )
  }
  if (footprint === "USB2_0_TYPE_C" || partNumber === "UBF31-0171") {
    return createJscadReplacement(createUsbCConnectorCadModel("UBF31-0171"), {
      boardTerminals: "usb-c",
      modelYawOffsetDegrees: -90,
    })
  }
  if (footprint.includes("2012670") || partNumber === "2012670005") {
    return createJscadReplacement(createUsbCConnectorCadModel("2012670005"), {
      boardTerminals: "usb-c",
    })
  }
  if (footprint.includes("2199119")) {
    return createGlbReplacement(externalGlbModelUrls.te2199119_4M2Socket, {
      modelPlanarOffsetMillimeters: {
        x: 0,
        y: te2199119_4ModelCenterOffsetMillimeters,
      },
      modelUnitToMmScaleFactor: 1000,
      modelBoardNormalDirection: "z-",
      modelVerticalOffsetMillimeters: te2199119_4ModelBottomOffsetMillimeters,
    })
  }
  if (footprint.includes("3020-14")) {
    return createJscadReplacement(
      createBoxHeaderCadModel({ columnCount: 7, pitch: 2.54, rowCount: 2 }),
    )
  }
  if (footprint === "JST4P_SMD_2_0_90D") {
    return createJscadReplacement(createGroveSmdConnectorCadModel())
  }
  if (footprint === "JST4P_1D0_6_5X4_35X3_1MM") {
    // BeagleBoard's released STEP identifies this as SM04B-SRSS. Register the
    // reference's four 1 mm solder tails; the two side tabs remain separate.
    return {
      kind: "step",
      modelStepUrl: externalStepModelUrls.jstSh4,
      modelOriginPosition: { x: 0, y: 0, z: 0 },
      modelPinPositions: Array.from({ length: 4 }, (_, index) => ({
        pinNumber: String(index + 1),
        x: -1.5 + index,
        y: 2.075,
      })),
    }
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
