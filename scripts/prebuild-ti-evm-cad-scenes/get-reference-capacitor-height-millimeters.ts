// Murata's GJM1555C1H2R4BB01 package is 1 x 0.5 x 0.5 mm;
// the final D/J/C/B code selects packaging, not a different body.
// https://datasheet.octopart.com/GJM1555C1H2R4BB01D-Murata-datasheet-14406022.pdf
export function getReferenceCapacitorHeightMillimeters(
  manufacturerPartNumber: string | undefined,
): number | undefined {
  if (/^GJM1555C1H2R4BB01[DJCB]$/u.test(manufacturerPartNumber?.trim().toUpperCase() ?? ""))
    return 0.5
  return undefined
}
