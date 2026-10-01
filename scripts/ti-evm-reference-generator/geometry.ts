export function getTrailingIndex(id: string): number {
  const match = id.match(/_(\d+)$/u)
  if (!match) throw new Error(`Expected trailing record index in ${id}`)
  return Number(match[1])
}

export function toIdentifier(sourceText: string): string {
  const normalized = sourceText.replaceAll(/[^A-Za-z0-9_]+/gu, "_").replaceAll(/^_+|_+$/gu, "")
  if (!normalized) return "unnamed"
  return /^[A-Za-z_]/u.test(normalized) ? normalized : `X_${normalized}`
}

export function normalizeRotation(rotationDegrees: number): number {
  return ((rotationDegrees % 360) + 360) % 360
}

export function nearlyEqual(first: number, second: number): boolean {
  return Math.abs(first - second) < 0.000001
}

export function round(coordinate: number): number {
  return Number(coordinate.toFixed(6))
}
