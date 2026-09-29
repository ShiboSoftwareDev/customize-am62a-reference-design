import {
  allOptionalModules,
  minimalOptionalModules,
  type OptionalModuleSelection,
} from "./module-config"

export type TiEvmVariant = {
  id: string
  label: string
  description: string
  circuitJsonUrl: string
  sourceSelection: OptionalModuleSelection
}

export type TiEvm = {
  id: "sk-am62a-lp"
  name: string
  category: string
  description: string
  sourceLabel: string
  sourceUrl: string
  variants: TiEvmVariant[]
}

const withSelection = (overrides: Partial<OptionalModuleSelection>): OptionalModuleSelection => ({
  ...minimalOptionalModules,
  ...overrides,
})

export const skAm62aLp: TiEvm = {
  id: "sk-am62a-lp",
  name: "SK-AM62A-LP",
  category: "Vision AI processor EVM",
  description:
    "TI's 12-layer AM62A edge-AI starter kit, reconstructed as parameterized tscircuit TSX.",
  sourceLabel: "TI SK-AM62A-LP design files",
  sourceUrl: "https://www.ti.com/tool/SK-AM62A-LP",
  variants: [
    {
      id: "full-evaluation-kit",
      label: "Full evaluation kit",
      description:
        "Every interface and on-board evaluation feature from the TI design is populated.",
      circuitJsonUrl: "/prebuilt-ti-evms/sk-am62a-lp/full-evaluation-kit.circuit.json.gz",
      sourceSelection: { ...allOptionalModules },
    },
    {
      id: "vision-ai-camera",
      label: "Vision AI camera",
      description: "Camera, HDMI, storage, USB, Ethernet, debug, and board monitoring.",
      circuitJsonUrl: "/prebuilt-ti-evms/sk-am62a-lp/vision-ai-camera.circuit.json.gz",
      sourceSelection: withSelection({
        storage: true,
        ethernet: true,
        usb: true,
        debug: true,
        camera: true,
        display: true,
        audio: true,
        monitoring: true,
      }),
    },
    {
      id: "headless-edge-ai",
      label: "Headless edge AI",
      description:
        "Camera input with local storage, networking, USB, and debug; no display or audio.",
      circuitJsonUrl: "/prebuilt-ti-evms/sk-am62a-lp/headless-edge-ai.circuit.json.gz",
      sourceSelection: withSelection({
        storage: true,
        ethernet: true,
        wireless: true,
        usb: true,
        debug: true,
        camera: true,
        monitoring: true,
      }),
    },
    {
      id: "industrial-gateway",
      label: "Industrial gateway",
      description: "Dual Ethernet, wireless, USB, storage, debug, and expansion interfaces.",
      circuitJsonUrl: "/prebuilt-ti-evms/sk-am62a-lp/industrial-gateway.circuit.json.gz",
      sourceSelection: withSelection({
        storage: true,
        ethernet: true,
        wireless: true,
        usb: true,
        debug: true,
        expansion: true,
        monitoring: true,
      }),
    },
    {
      id: "minimum-bring-up",
      label: "Minimum bring-up",
      description:
        "Required processor, memory, power, clock, reset, boot, USB boot, and debug circuitry.",
      circuitJsonUrl: "/prebuilt-ti-evms/sk-am62a-lp/minimum-bring-up.circuit.json.gz",
      sourceSelection: withSelection({ usb: true, debug: true, monitoring: true }),
    },
  ],
}

export function getTiEvmVariant(variantId: string): TiEvmVariant {
  const variant = skAm62aLp.variants.find(({ id }) => id === variantId)
  if (!variant) throw new Error(`Unknown ${skAm62aLp.name} variant: ${variantId}`)
  return variant
}
