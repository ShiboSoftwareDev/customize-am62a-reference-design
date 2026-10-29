const kicadPackageBaseUrl =
  "https://sources.debian.org/data/main/k/kicad-packages3d/9.0.8-1~bpo13%2B1"

export const externalStepModelUrls = {
  amphenolHdmiA:
    `${kicadPackageBaseUrl}/Connector_Video.3dshapes/` +
    "HDMI_A_Amphenol_10029449-x01xLF_Horizontal.step",
  molexMicroHdmiD:
    `${kicadPackageBaseUrl}/Connector_Video.3dshapes/` + "HDMI_Micro-D_Molex_46765-0xxx.step",
  cuiSj43514AudioJack:
    "https://raw.githubusercontent.com/OLIMEX/ESP32-ADF/" +
    "0c8be17c9b54dd790953d77f1a5ded12204756dc/" +
    "HARDWARE/ESP32-ADF%20Rev.C/3d/sj-43514-smt-tr.stp",
  pinHeader1x04P2_54Smd:
    `${kicadPackageBaseUrl}/Connector_PinHeader_2.54mm.3dshapes/` +
    "PinHeader_1x04_P2.54mm_Vertical_SMD_Pin1Left.step",
  pinHeader2x05P2Smd:
    `${kicadPackageBaseUrl}/Connector_PinHeader_2.00mm.3dshapes/` +
    "PinHeader_2x05_P2.00mm_Vertical_SMD.step",
  pinHeader2x10P1_27Smd:
    `${kicadPackageBaseUrl}/Connector_PinHeader_1.27mm.3dshapes/` +
    "PinHeader_2x10_P1.27mm_Vertical_SMD.step",
  pinHeader2x10P2_54ThroughHole:
    `${kicadPackageBaseUrl}/Connector_PinHeader_2.54mm.3dshapes/` +
    "PinHeader_2x10_P2.54mm_Vertical.step",
} as const

export const externalGlbModelUrls = {
  te2199119_4M2Socket:
    "https://static.ultralibrarian.com/part-previews/3d-models/" +
    "E72/8E9/789/B39/4182448-c-2199119-4-c-3d.glb",
} as const
