import type { ParameterizedTiEvmId, ParameterizedTiEvmOptions } from "./evms/parameterized-ti-evms"
import {
  allOptionalModules,
  minimalOptionalModules,
  type OptionalModuleSelection,
} from "./module-config"

export type TiEvmId = "sk-am62a-lp" | ParameterizedTiEvmId

export type TiEvmVariant = {
  id: string
  label: string
  description: string
  circuitJsonUrl: string
  sourceSelection?: OptionalModuleSelection
  evmOptions?: ParameterizedTiEvmOptions
}

export type TiEvm = {
  id: TiEvmId
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

type EvmVariantCopy = {
  full: string
  application: string
  bench: string
  benchLabel?: string
  benchOptions?: ParameterizedTiEvmOptions
  minimum: string
}

const optionVariants = (evmId: ParameterizedTiEvmId, copy: EvmVariantCopy): TiEvmVariant[] => [
  {
    id: "full-evaluation-module",
    label: "Full evaluation module",
    description: copy.full,
    circuitJsonUrl: `/prebuilt-ti-evms/${evmId}/full-evaluation-module.circuit.json.gz`,
    evmOptions: { connectors: true, controls: true, measurement: true },
  },
  {
    id: "application-ready",
    label: "Application-ready",
    description: copy.application,
    circuitJsonUrl: `/prebuilt-ti-evms/${evmId}/application-ready.circuit.json.gz`,
    evmOptions: { connectors: true, controls: false, measurement: false },
  },
  {
    id: "bench-validation",
    label: copy.benchLabel ?? "Bench validation",
    description: copy.bench,
    circuitJsonUrl: `/prebuilt-ti-evms/${evmId}/bench-validation.circuit.json.gz`,
    evmOptions: copy.benchOptions ?? { connectors: false, controls: true, measurement: true },
  },
  {
    id: "minimum-core",
    label: "Minimum core",
    description: copy.minimum,
    circuitJsonUrl: `/prebuilt-ti-evms/${evmId}/minimum-core.circuit.json.gz`,
    evmOptions: { connectors: false, controls: false, measurement: false },
  },
]

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
      description: "Camera, local storage, networking, USB, and debug without display or audio.",
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
      description: "Processor, memory, power, clock, reset, boot, USB boot, and debug circuitry.",
      circuitJsonUrl: "/prebuilt-ti-evms/sk-am62a-lp/minimum-bring-up.circuit.json.gz",
      sourceSelection: withSelection({ usb: true, debug: true, monitoring: true }),
    },
  ],
}

export const tiEvms: TiEvm[] = [
  skAm62aLp,
  {
    id: "bq25731evm",
    name: "BQ25731EVM",
    category: "1-to-5-cell buck-boost charger EVM",
    description: "I2C-controlled 16-A NVDC battery charger evaluation module.",
    sourceLabel: "TI BQ25731EVM reference",
    sourceUrl: "https://www.ti.com/tool/BQ25731EVM",
    variants: optionVariants("bq25731evm", {
      full: "Charger power stage, battery and system connectors, I2C control, and rail testpoints.",
      application: "Charger power stage with adapter, battery, and system connectors populated.",
      bench: "Charger power stage with adapter, battery, system, and I2C control connectors.",
      benchLabel: "Digital integration",
      benchOptions: { connectors: true, controls: true, measurement: false },
      minimum: "BQ25731 buck-boost charger power stage without external evaluation headers.",
    }),
  },
  {
    id: "drv8210evm",
    name: "DRV8210EVM",
    category: "Low-voltage H-bridge motor-driver EVM",
    description: "Brushed-DC motor-driver evaluation module with selectable control access.",
    sourceLabel: "TI DRV8210EVM reference",
    sourceUrl: "https://www.ti.com/tool/DRV8210EVM",
    variants: optionVariants("drv8210evm", {
      full: "Motor power and output connectors, input controls, adjustment pots, and testpoints.",
      application: "DRV8210 motor-driver core with power and motor connectors.",
      bench: "DRV8210 motor-driver core with input adjustment and signal testpoints.",
      minimum: "DRV8210 H-bridge and required local bypass network only.",
    }),
  },
  {
    id: "lmk1c1104evm",
    name: "LMK1C1104EVM",
    category: "Low-jitter clock-buffer EVM",
    description: "Four-output LVCMOS fan-out clock-buffer evaluation module with 50-ohm outputs.",
    sourceLabel: "TI LMK1C1104EVM reference",
    sourceUrl: "https://www.ti.com/tool/LMK1C1104EVM",
    variants: optionVariants("lmk1c1104evm", {
      full: "Four-output clock-buffer reference with auxiliary power, output-enable control, and testpoints.",
      application: "LMK1C1104 clock fan-out circuit with auxiliary power access.",
      bench: "LMK1C1104 clock fan-out circuit with output-enable control and rail testpoints.",
      minimum: "Four-output LMK1C1104 clock-buffer reference circuit only.",
    }),
  },
  {
    id: "tps62933pevm",
    name: "TPS62933PEVM",
    category: "3-A synchronous buck-converter EVM",
    description: "Configurable high-efficiency step-down converter evaluation module.",
    sourceLabel: "TI TPS62933PEVM reference",
    sourceUrl: "https://www.ti.com/tool/TPS62933PEVM",
    variants: optionVariants("tps62933pevm", {
      full: "Converter reference with input/output connectors, enable and RT headers, and testpoints.",
      application: "TPS62933P converter with input and regulated-output connectors.",
      bench: "TPS62933P converter with enable, switching-frequency, and rail measurement access.",
      minimum: "TPS62933P buck-converter reference circuit without evaluation headers.",
    }),
  },
]

export function getTiEvm(evmId: TiEvmId): TiEvm {
  const evm = tiEvms.find(({ id }) => id === evmId)
  if (!evm) throw new Error(`Unknown TI EVM: ${evmId}`)
  return evm
}

export function getTiEvmVariant(evm: TiEvm, variantId: string): TiEvmVariant {
  const variant = evm.variants.find(({ id }) => id === variantId)
  if (!variant) throw new Error(`Unknown ${evm.name} variant: ${variantId}`)
  return variant
}
