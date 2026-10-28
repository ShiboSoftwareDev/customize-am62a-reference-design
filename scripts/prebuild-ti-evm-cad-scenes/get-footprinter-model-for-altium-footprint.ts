function getHeaderModel(altiumFootprint: string): string | undefined {
  if (altiumFootprint.includes("FTR-") || altiumFootprint.includes("PREC")) {
    return undefined
  }

  const rowFirstDimensions = /^HDR_(\d+)X(\d+)/u.exec(altiumFootprint)
  if (rowFirstDimensions) {
    const rowCount = Number(rowFirstDimensions[1])
    const pinCountPerRow = Number(rowFirstDimensions[2])
    return `headermodule${rowCount * pinCountPerRow}_rows${rowCount}_p2.54mm_male`
  }

  const rowLastDimensions = /^HEADER(\d+)X(\d+)/u.exec(altiumFootprint)
  if (rowLastDimensions) {
    const pinCountPerRow = Number(rowLastDimensions[1])
    const rowCount = Number(rowLastDimensions[2])
    return `headermodule${rowCount * pinCountPerRow}_rows${rowCount}_p2.54mm_male`
  }

  const headerPinCount = /^HEADER(\d+)P_/u.exec(altiumFootprint)?.[1]
  if (headerPinCount) return `headermodule${headerPinCount}_p2.54mm_male`

  const mikroBusPinCount = /^MIKROBUS(\d+)_/u.exec(altiumFootprint)?.[1]
  if (mikroBusPinCount) {
    return `headermodule${mikroBusPinCount}_rows2_p2.54mm_male`
  }

  return undefined
}

export function getFootprinterModelForAltiumFootprint(altiumFootprint: string): string | undefined {
  const normalizedFootprint = altiumFootprint.trim().toUpperCase()

  const headerModel = getHeaderModel(normalizedFootprint)
  if (headerModel) return headerModel

  if (normalizedFootprint.includes("LPJG16314A4NL")) {
    return "rj45_pins14_w16mm_h20mm"
  }

  return undefined
}
