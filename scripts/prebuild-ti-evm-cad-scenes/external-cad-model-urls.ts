const kicadPackageBaseUrl =
  "https://sources.debian.org/data/main/k/kicad-packages3d/9.0.8-1~bpo13%2B1"

export const externalStepModelUrls = {
  msop8: `${kicadPackageBaseUrl}/Package_SO.3dshapes/MSOP-8_3x3mm_P0.65mm.step`,
  msop8PowerPad: `${kicadPackageBaseUrl}/Package_SO.3dshapes/MSOP-8-1EP_3x3mm_P0.65mm_EP1.73x1.85mm.step`,
  tssop8: `${kicadPackageBaseUrl}/Package_SO.3dshapes/TSSOP-8_4.4x3mm_P0.65mm.step`,
  tssop14: `${kicadPackageBaseUrl}/Package_SO.3dshapes/TSSOP-14_4.4x5mm_P0.65mm.step`,
  tssop16: `${kicadPackageBaseUrl}/Package_SO.3dshapes/TSSOP-16_4.4x5mm_P0.65mm.step`,
  tssop24: `${kicadPackageBaseUrl}/Package_SO.3dshapes/TSSOP-24_4.4x7.8mm_P0.65mm.step`,
  tssop56: `${kicadPackageBaseUrl}/Package_SO.3dshapes/TSSOP-56_6.1x14mm_P0.5mm.step`,
  msop10: `${kicadPackageBaseUrl}/Package_SO.3dshapes/MSOP-10_3x3mm_P0.5mm.step`,
  sc70_5: `${kicadPackageBaseUrl}/Package_TO_SOT_SMD.3dshapes/SOT-353_SC-70-5.step`,
  sot23_5: `${kicadPackageBaseUrl}/Package_TO_SOT_SMD.3dshapes/SOT-23-5.step`,
  sot23_6: `${kicadPackageBaseUrl}/Package_TO_SOT_SMD.3dshapes/SOT-23-6.step`,
  sot23: `${kicadPackageBaseUrl}/Package_TO_SOT_SMD.3dshapes/SOT-23.step`,
  vssop8Dcu: `${kicadPackageBaseUrl}/Package_SO.3dshapes/` + "VSSOP-8_2.3x2mm_P0.5mm.step",
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
    "PinHeader_1x04_P2.54mm_Vertical_SMD_Pin1Right.step",
  pinHeader2x05P2_54Smd:
    `${kicadPackageBaseUrl}/Connector_PinHeader_2.54mm.3dshapes/` +
    "PinHeader_2x05_P2.54mm_Vertical_SMD.step",
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
