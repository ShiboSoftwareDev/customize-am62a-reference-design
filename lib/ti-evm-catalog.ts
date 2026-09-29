import type { ParameterizedTiEvmId, ParameterizedTiEvmOptions } from "./evms/parameterized-ti-evms"
import {
  allOptionalModules,
  type OptionalModuleGroupId,
  type OptionalModuleSelection,
} from "./module-config"

export type TiEvmId = "sk-am62a-lp" | ParameterizedTiEvmId

export type TiEvmRemovableFeature = {
  id: string
  label: string
  description: string
}

export type TiEvmVariant = {
  id: string
  label: string
  circuitJsonUrl: string
  schematicCircuitJsonUrl?: string
  removedFeatureIds: string[]
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
  sourcePath: string
  removableFeatures: TiEvmRemovableFeature[]
  variants: TiEvmVariant[]
}

type SkAm62aFeature = TiEvmRemovableFeature & {
  moduleGroups: OptionalModuleGroupId[]
}

const skAm62aFeatures: SkAm62aFeature[] = [
  {
    id: "vision-media",
    label: "camera, HDMI, and audio",
    description: "CSI camera input, HDMI output, audio codec, and audio connectors.",
    moduleGroups: ["camera", "display", "audio"],
  },
  {
    id: "network-io",
    label: "networking and expansion I/O",
    description: "Ethernet, wireless, USB host/DRD, and expansion interfaces.",
    moduleGroups: ["ethernet", "wireless", "usb", "expansion"],
  },
  {
    id: "storage-diagnostics",
    label: "storage and diagnostics",
    description: "eMMC, SD, OSPI, debug, board monitoring, and test points.",
    moduleGroups: ["storage", "debug", "monitoring"],
  },
]

function createVariants(params: {
  evmId: TiEvmId
  features: TiEvmRemovableFeature[]
  createPopulation: (
    removedFeatureIds: string[],
  ) => { sourceSelection: OptionalModuleSelection } | { evmOptions: ParameterizedTiEvmOptions }
}): TiEvmVariant[] {
  const combinationCount = 1 << params.features.length

  return Array.from({ length: combinationCount }, (_, mask) => {
    const removedFeatures = params.features.filter((_, index) => mask & (1 << index))
    const removedFeatureIds = removedFeatures.map(({ id }) => id)
    const isFullBoard = mask === 0
    const isMinimalBoard = mask === combinationCount - 1
    const id = isFullBoard
      ? "full-board"
      : isMinimalBoard
        ? "minimal-board"
        : `remove-${removedFeatureIds.join("-")}`

    return {
      id,
      label: isFullBoard
        ? "Full board"
        : isMinimalBoard
          ? "Minimal board"
          : `Remove ${removedFeatures.map(({ label }) => label).join(" and ")}`,
      circuitJsonUrl: `/prebuilt-ti-evms/${params.evmId}/${id}.circuit.json.gz`,
      schematicCircuitJsonUrl:
        params.evmId === "sk-am62a-lp"
          ? undefined
          : `/prebuilt-ti-evms/${params.evmId}/${id}.schematic.circuit.json.gz`,
      removedFeatureIds,
      ...params.createPopulation(removedFeatureIds),
    }
  })
}

function createSkAm62aSelection(removedFeatureIds: string[]): {
  sourceSelection: OptionalModuleSelection
} {
  const sourceSelection = { ...allOptionalModules }
  for (const feature of skAm62aFeatures) {
    if (!removedFeatureIds.includes(feature.id)) continue
    for (const moduleGroup of feature.moduleGroups) sourceSelection[moduleGroup] = false
  }
  return { sourceSelection }
}

function createEvaluationOptions(removedFeatureIds: string[]): {
  evmOptions: ParameterizedTiEvmOptions
} {
  return {
    evmOptions: { removedFeatureIds },
  }
}

export const skAm62aLp: TiEvm = {
  id: "sk-am62a-lp",
  name: "SK-AM62A-LP",
  category: "Vision AI processor EVM",
  description:
    "TI's 12-layer AM62A edge-AI starter kit, reconstructed as parameterized tscircuit TSX.",
  sourceLabel: "TI SK-AM62A-LP design files",
  sourceUrl: "https://www.ti.com/tool/SK-AM62A-LP",
  sourcePath: "boards/sk-am62a-lp/index.circuit.tsx",
  removableFeatures: skAm62aFeatures,
  variants: createVariants({
    evmId: "sk-am62a-lp",
    features: skAm62aFeatures,
    createPopulation: createSkAm62aSelection,
  }),
}

function createEvaluationEvm(params: {
  id: ParameterizedTiEvmId
  name: string
  category: string
  description: string
  sourceLabel: string
  sourceUrl: string
  sourcePath: string
  removableFeatures: TiEvmRemovableFeature[]
}): TiEvm {
  return {
    ...params,
    variants: createVariants({
      evmId: params.id,
      features: params.removableFeatures,
      createPopulation: createEvaluationOptions,
    }),
  }
}

export const tiEvms: TiEvm[] = [
  skAm62aLp,
  createEvaluationEvm({
    id: "drv8307evm",
    name: "DRV8307EVM",
    category: "Three-phase BLDC pre-driver EVM",
    description:
      "TI's 84-component DRV8307/DRV8308 motor-control evaluation board with three external MOSFET half-bridges.",
    sourceLabel: "TI DRV8307EVM Altium release",
    sourceUrl: "https://www.ti.com/tool/DRV8307EVM",
    sourcePath: "boards/drv8307evm/index.circuit.tsx",
    removableFeatures: [
      {
        id: "onboard-speed-control",
        label: "on-board speed control",
        description: "TLC555 PWM generator, speed potentiometer, and support components.",
      },
      {
        id: "hall-interface",
        label: "Hall-sensor interface",
        description: "Hall input conditioning, selection jumpers, and buffer devices.",
      },
    ],
  }),
  createEvaluationEvm({
    id: "lm5155evm-fly",
    name: "LM5155EVM-FLY",
    category: "Isolated flyback controller EVM",
    description:
      "TI's medium-complexity isolated 5-V/4-A flyback converter with primary controller, transformer, secondary feedback, and protection networks.",
    sourceLabel: "TI LM5155EVM-FLY Altium release",
    sourceUrl: "https://www.ti.com/tool/LM5155EVM-FLY",
    sourcePath: "boards/lm5155evm-fly/index.circuit.tsx",
    removableFeatures: [
      {
        id: "test-and-measurement",
        label: "test and measurement hardware",
        description: "Optional test points and oscilloscope probe access used during evaluation.",
      },
      {
        id: "configuration-interface",
        label: "configuration interface",
        description:
          "Optional evaluation header and population option for controller configuration.",
      },
    ],
  }),
  createEvaluationEvm({
    id: "lm251772evm-pd",
    name: "LM251772EVM-PD",
    category: "Four-switch buck-boost power-density EVM",
    description:
      "TI's 169-component high-power LM251772 evaluation module with synchronous four-switch power stage and dense configuration network.",
    sourceLabel: "TI LM251772EVM-PD Altium release",
    sourceUrl: "https://www.ti.com/tool/LM251772EVM-PD",
    sourcePath: "boards/lm251772evm-pd/index.circuit.tsx",
    removableFeatures: [
      {
        id: "test-and-measurement",
        label: "test and measurement hardware",
        description:
          "Thirteen reference test points distributed across the power and control nets.",
      },
      {
        id: "configuration-jumpers",
        label: "configuration jumpers",
        description: "Evaluation-only mode, threshold, and control jumper population.",
      },
    ],
  }),
  createEvaluationEvm({
    id: "lmg342x-bb-evm",
    name: "LMG342X-BB-EVM",
    category: "650-V GaN half-bridge motherboard",
    description:
      "TI's 157-component high-voltage GaN half-bridge platform with isolated bias, PWM conditioning, fault reporting, and power terminals.",
    sourceLabel: "TI LMG342X-BB-EVM Altium release",
    sourceUrl: "https://www.ti.com/tool/LMG342X-BB-EVM",
    sourcePath: "boards/lmg342x-bb-evm/index.circuit.tsx",
    removableFeatures: [
      {
        id: "measurement-interface",
        label: "measurement interface",
        description:
          "Evaluation-only PWM, rail, ground, switch-node, and tachometer access points.",
      },
      {
        id: "status-indicators",
        label: "status indicators",
        description: "High-side, low-side, over-current, fault, and rail-status LEDs.",
      },
    ],
  }),
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

export function getTiEvmVariantForRemovedFeatures(
  evm: TiEvm,
  removedFeatureIds: string[],
): TiEvmVariant {
  const key = [...removedFeatureIds].sort().join(":")
  const variant = evm.variants.find(
    (candidate) => [...candidate.removedFeatureIds].sort().join(":") === key,
  )
  if (!variant) throw new Error(`Unknown ${evm.name} feature combination: ${key}`)
  return variant
}
