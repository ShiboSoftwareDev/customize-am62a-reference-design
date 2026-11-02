// TI's dimensioned footprint names end with a package height in millimeters,
// e.g. DSBGA12_15-74_60X70_0-4 and LQFP64_19-68_390X390_1-6.
export function getPackageHeightMillimeters(normalizedFootprint: string): number | undefined {
  const height = /_\d{2,3}X\d{2,3}_(\d+)(?:-(\d+))?$/u.exec(normalizedFootprint)
  if (!height) return undefined
  const heightMillimeters = Number(`${height[1]}.${height[2] ?? "0"}`)
  return heightMillimeters > 0 ? heightMillimeters : undefined
}
