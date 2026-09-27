declare module "circuit-json" {
  export type AnyCircuitElement = {
    type: string
    [property: string]: unknown
  }
}
