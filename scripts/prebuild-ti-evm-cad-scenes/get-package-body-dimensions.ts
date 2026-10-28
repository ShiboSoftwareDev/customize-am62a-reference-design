export function getPackageBodyDimensionsMillimeters(
  normalizedFootprint: string,
): { x: number; y: number } | undefined {
  const explicitMillimeters = /(?:_|-)(\d+(?:D\d+)?)X(\d+(?:D\d+)?)MM(?:_|$)/u.exec(
    normalizedFootprint,
  )
  if (explicitMillimeters) {
    return {
      x: Number(explicitMillimeters[1].replace("D", ".")),
      y: Number(explicitMillimeters[2].replace("D", ".")),
    }
  }

  const encodedDecimalDimensions = getEncodedDecimalDimensions(normalizedFootprint)
  if (encodedDecimalDimensions) return encodedDecimalDimensions

  const milDimensions = /_(\d{2,3})X(\d{2,3})(?:_|$)/u.exec(normalizedFootprint)
  if (!milDimensions) return undefined
  return {
    x: roundToHundredth(Number(milDimensions[1]) * 0.0254),
    y: roundToHundredth(Number(milDimensions[2]) * 0.0254),
  }
}

function getEncodedDecimalDimensions(
  normalizedFootprint: string,
): { x: number; y: number } | undefined {
  const dimensionsWithDecimalX = /_(\d+(?:P\d+|_\d+))X(\d+(?:P\d+|_\d+)?)(?:_|$)/u.exec(
    normalizedFootprint,
  )
  const dimensionsWithDecimalY = /_(\d+)X(\d+(?:P\d+|_\d+))(?:_|$)/u.exec(normalizedFootprint)
  const dimensions = dimensionsWithDecimalX ?? dimensionsWithDecimalY
  if (!dimensions) return undefined
  const parsedDimensions = {
    x: parseEncodedDecimal(dimensions[1]),
    y: parseEncodedDecimal(dimensions[2]),
  }
  if (parsedDimensions.x > 50 || parsedDimensions.y > 50) return undefined
  return parsedDimensions
}

function parseEncodedDecimal(encodedNumber: string): number {
  return Number(encodedNumber.replace(/[P_]/u, "."))
}

function roundToHundredth(millimeters: number): number {
  return Math.round(millimeters * 100) / 100
}
