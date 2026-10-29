import type { CadModelComponentIdentity, CadModelReplacement } from "./get-cad-model-replacement"

function createFootprinterReplacement(params: {
  footprinterString: string
  modelYawOffsetDegrees?: number
}): CadModelReplacement {
  return { kind: "footprinter", ...params }
}

function getHeaderReplacement(
  componentIdentity: CadModelComponentIdentity,
): CadModelReplacement | undefined {
  const normalizedFootprint = componentIdentity.altiumFootprint.toUpperCase()
  const headerDimensions = /^(?:HDR_|HEADER)(\d+)X(\d+)/u.exec(normalizedFootprint)
  if (headerDimensions) {
    const firstDimension = Number(headerDimensions[1])
    const secondDimension = Number(headerDimensions[2])
    const rowCount = Math.min(firstDimension, secondDimension)
    const gender = normalizedFootprint === "HEADER23X2" ? "female" : "male"
    return createFootprinterReplacement({
      footprinterString: `headermodule${firstDimension * secondDimension}_rows${rowCount}_p2.54mm_${gender}`,
    })
  }

  const headerPinCount = /^HEADER(\d+)P_/u.exec(normalizedFootprint)?.[1]
  if (headerPinCount) {
    return createFootprinterReplacement({
      footprinterString: `headermodule${headerPinCount}_p2.54mm_male`,
      modelYawOffsetDegrees: 90,
    })
  }

  const singleInlinePinCount = /^SIP(\d+)(?:_|$)/u.exec(normalizedFootprint)?.[1]
  if (singleInlinePinCount) {
    return createFootprinterReplacement({
      footprinterString: `headermodule${singleInlinePinCount}_p2.54mm_male`,
      modelYawOffsetDegrees: 90,
    })
  }

  const mikroBusPinCount = /^MIKROBUS(\d+)_/u.exec(normalizedFootprint)?.[1]
  if (mikroBusPinCount) {
    return createFootprinterReplacement({
      footprinterString: `headermodule${mikroBusPinCount}_rows2_p2.54mm_male`,
    })
  }
  return undefined
}

function getFpcReplacement(altiumFootprint: string): CadModelReplacement | undefined {
  const normalizedFootprint = altiumFootprint.toUpperCase()
  const fpcMatch = /^FPC(\d+)_0D5/u.exec(normalizedFootprint)
  return fpcMatch
    ? createFootprinterReplacement({ footprinterString: `fpc${fpcMatch[1]}_p0.5mm` })
    : undefined
}

function getKnownConnectorReplacement(
  componentIdentity: CadModelComponentIdentity,
): CadModelReplacement | undefined {
  const normalizedFootprint = componentIdentity.altiumFootprint.toUpperCase()
  if (/^BUTTON2_3P_4D55X2D3X1D88MM/u.test(normalizedFootprint)) {
    return createFootprinterReplacement({ footprinterString: "smdpushbutton_w4.55mm_h2.3mm" })
  }
  if (/^SW4SMD_63X161LS/u.test(normalizedFootprint)) {
    return createFootprinterReplacement({ footprinterString: "smdpushbutton_w6.3mm_h6.3mm" })
  }
  return undefined
}

export function getConnectorCadModelReplacement(
  componentIdentity: CadModelComponentIdentity,
): CadModelReplacement | undefined {
  return (
    getHeaderReplacement(componentIdentity) ??
    getFpcReplacement(componentIdentity.altiumFootprint) ??
    getKnownConnectorReplacement(componentIdentity)
  )
}
