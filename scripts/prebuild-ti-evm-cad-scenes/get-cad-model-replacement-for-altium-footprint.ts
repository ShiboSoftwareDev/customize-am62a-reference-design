export type CadModelReplacement =
  | { kind: "footprinter"; footprinterString: string }
  | { fitHeightMm: number; kind: "step"; modelStepUrl: string }

const kicadModelDirectory = "/cad-models/kicad"

function getFootprinterReplacement(footprinterString: string): CadModelReplacement {
  return { kind: "footprinter", footprinterString }
}

function getStepReplacement(params: {
  fitHeightMm: number
  modelFilename: string
}): CadModelReplacement {
  return {
    fitHeightMm: params.fitHeightMm,
    kind: "step",
    modelStepUrl: `${kicadModelDirectory}/${params.modelFilename}`,
  }
}

function getHeaderReplacement(normalizedFootprint: string): CadModelReplacement | undefined {
  if (normalizedFootprint.includes("FTR-") || normalizedFootprint.includes("PREC")) {
    return undefined
  }

  const headerDimensions = /^(?:HDR_|HEADER)(\d+)X(\d+)/u.exec(normalizedFootprint)
  if (headerDimensions) {
    const firstDimension = Number(headerDimensions[1])
    const secondDimension = Number(headerDimensions[2])
    const rowCount = Math.min(firstDimension, secondDimension)
    return getFootprinterReplacement(
      `headermodule${firstDimension * secondDimension}_rows${rowCount}_p2.54mm_male`,
    )
  }

  const headerPinCount = /^HEADER(\d+)P_/u.exec(normalizedFootprint)?.[1]
  if (headerPinCount) {
    return getFootprinterReplacement(`headermodule${headerPinCount}_p2.54mm_male`)
  }

  const mikroBusPinCount = /^MIKROBUS(\d+)_/u.exec(normalizedFootprint)?.[1]
  if (mikroBusPinCount) {
    return getFootprinterReplacement(`headermodule${mikroBusPinCount}_rows2_p2.54mm_male`)
  }

  return undefined
}

function getConnectorReplacement(normalizedFootprint: string): CadModelReplacement | undefined {
  if (/^(?:CON_SD9_|SD-MICRO-|MICRO_SD_)/u.test(normalizedFootprint)) {
    return getStepReplacement({
      fitHeightMm: 1.68,
      modelFilename: "microSD_HC_Hirose_DM3AT-SF-PEJM5.step",
    })
  }
  if (/^(?:CON_USBA|USB7P_|USB_A_SH)/u.test(normalizedFootprint)) {
    return getStepReplacement({
      fitHeightMm: 11.37,
      modelFilename: "USB_A_TE_292303-7_Horizontal.step",
    })
  }
  if (/^(?:CON_USBC24_|USB2_0_TYPE_C)/u.test(normalizedFootprint)) {
    return getStepReplacement({
      fitHeightMm: 4.18,
      modelFilename: "USB_C_Receptacle_Amphenol_12401610E4-2A.step",
    })
  }
  if (/^(?:CON_MUSBB5_)/u.test(normalizedFootprint)) {
    return getStepReplacement({
      fitHeightMm: 2.94,
      modelFilename: "USB_Micro-B_Molex_47346-0001.step",
    })
  }
  if (/^USB5MINI_/u.test(normalizedFootprint)) {
    return getStepReplacement({
      fitHeightMm: 5,
      modelFilename: "USB_Mini-B_Lumberg_2486_01_Horizontal.step",
    })
  }
  if (/^(?:CON_HDMI19_|HDMI19P_|CONN19_HDMI)/u.test(normalizedFootprint)) {
    return getStepReplacement({
      fitHeightMm: 4.75,
      modelFilename: "HDMI_A_Contact_Technology_19APL2_Horizontal.step",
    })
  }
  if (normalizedFootprint.includes("LPJG16314A4NL")) {
    return getFootprinterReplacement("rj45_pins14_w16mm_h20mm")
  }
  if (/^RJ45/u.test(normalizedFootprint)) {
    return getStepReplacement({
      fitHeightMm: 18.68,
      modelFilename: "RJ45_Amphenol_RJHSE538X.step",
    })
  }
  if (/^CON_AV4_/u.test(normalizedFootprint)) {
    return getStepReplacement({
      fitHeightMm: 8.8,
      modelFilename: "Jack_3.5mm_CUI_SJ1-3523N_Horizontal.step",
    })
  }
  if (/^(?:CON_JACK3_U-FL|U-FL)/u.test(normalizedFootprint)) {
    return getStepReplacement({
      fitHeightMm: 1.25,
      modelFilename: "U.FL_Hirose_U.FL-R-SMT-1_Vertical.step",
    })
  }
  if (/^CONN3-PWR-/u.test(normalizedFootprint)) {
    return getStepReplacement({ fitHeightMm: 14.6, modelFilename: "BarrelJack_Horizontal.step" })
  }
  return undefined
}

function getSwitchReplacement(normalizedFootprint: string): CadModelReplacement | undefined {
  if (/^BUTTON2_3P_4D55X2D3X1D88MM/u.test(normalizedFootprint)) {
    return getFootprinterReplacement("smdpushbutton_w4.55mm_h2.3mm")
  }
  if (/^SW4SMD_63X161LS/u.test(normalizedFootprint)) {
    return getFootprinterReplacement("smdpushbutton_w6.3mm_h6.3mm")
  }
  return undefined
}

export function getCadModelReplacementForAltiumFootprint(
  altiumFootprint: string,
): CadModelReplacement | undefined {
  const normalizedFootprint = altiumFootprint.trim().toUpperCase()

  return (
    getHeaderReplacement(normalizedFootprint) ??
    getConnectorReplacement(normalizedFootprint) ??
    getSwitchReplacement(normalizedFootprint)
  )
}
