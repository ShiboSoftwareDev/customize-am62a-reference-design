export type ReferencePoint = {
  x: number
  y: number
}

export type ReferenceSmtPad = {
  kind: "smt"
  pinKey?: string
  layer: "top" | "bottom"
  x: number
  y: number
  shape: "circle" | "pill" | "rect" | "rotated_pill" | "rotated_rect"
  width?: number
  height?: number
  radius?: number
  ccwRotation?: number
}

export type ReferencePlatedHole = {
  kind: "plated_hole"
  pinKey?: string
  x: number
  y: number
  shape: "circle" | "oval" | "circular_hole_with_rect_pad"
  holeDiameter?: number
  outerDiameter?: number
  holeWidth?: number
  holeHeight?: number
  outerWidth?: number
  outerHeight?: number
  pcbRotation?: number
  rectPadWidth?: number
  rectPadHeight?: number
}

export type ReferenceHole = {
  kind: "hole"
  x: number
  y: number
  diameter: number
}

export type ReferencePad = ReferenceSmtPad | ReferencePlatedHole | ReferenceHole

export type ReferenceSchematicPlacement = {
  x: number
  y: number
  width: number
  height: number
  leftPins: string[]
  rightPins: string[]
  topPins: string[]
  bottomPins: string[]
}

export type ReferenceComponent = {
  name: string
  value: string
  description: string
  x: number
  y: number
  layer: "top" | "bottom"
  pinLabels: Record<string, string[]>
  pads: ReferencePad[]
  removableFeatureId?: string
  schematic?: ReferenceSchematicPlacement
}

export type ReferenceNet = {
  name: string
  endpoints: Array<{
    componentName: string
    pinKey: string
  }>
}

export type ReferenceSilkscreenLine = {
  kind: "line"
  ownerComponentName?: string
  layer: "top" | "bottom"
  strokeWidth: number
  route: ReferencePoint[]
}

export type ReferenceSilkscreenText = {
  kind: "text"
  ownerComponentName?: string
  layer: "top" | "bottom"
  text: string
  x: number
  y: number
  fontSize: number
  rotation: number
}

export type ReferenceSilkscreen = ReferenceSilkscreenLine | ReferenceSilkscreenText

export type ReferenceEvmDefinition = {
  id: string
  name: string
  sourceUrl: string
  sourceArchiveSha256: string
  sourcePcbPath: string
  sourceSchematicPaths: string[]
  outline: ReferencePoint[]
  width: number
  height: number
  thickness: number
  layers: 2 | 4 | 6 | 8 | 10
  components: ReferenceComponent[]
  nets: ReferenceNet[]
  standaloneHoles: ReferencePad[]
  silkscreen: ReferenceSilkscreen[]
}
