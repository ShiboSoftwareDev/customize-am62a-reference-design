// TI's dimensioned footprint names end with a package height in millimeters,
// e.g. DSBGA12_15-74_60X70_0-4 and LQFP64_19-68_390X390_1-6.
export function getPackageHeightMillimeters(normalizedFootprint: string): number | undefined {
  const height = /(?:_\d{2,3}X\d{2,3}(?:_SMD)?|^IND\d{4})_(\d+)(?:-(\d+))?$/u.exec(
    normalizedFootprint,
  )
  if (height) return Number(`${height[1]}.${height[2] ?? "0"}`) || undefined
  const hundredthMillimeterHeight = /(?:_|-)\d{3}X\d{3}X(\d{2,3})MM(?:_|$)/u.exec(
    normalizedFootprint,
  )
  if (hundredthMillimeterHeight) return Number(hundredthMillimeterHeight[1]) / 100 || undefined
  const explicitMillimeterHeight =
    /(?:_|-)\d+(?:[DP_]\d+)?X\d+(?:[DP_]\d+)?X(\d+(?:[DP_]\d+)?)MM(?:_|$)/u.exec(
      normalizedFootprint,
    )
  if (!explicitMillimeterHeight?.[1]) return undefined
  const heightMillimeters = Number(explicitMillimeterHeight[1].replace(/[DP_]/u, "."))
  return heightMillimeters > 0 ? heightMillimeters : undefined
}
