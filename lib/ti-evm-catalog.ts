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

const evaluationFeatures: TiEvmRemovableFeature[] = [
  {
    id: "controls",
    label: "evaluation controls",
    description: "Configuration headers, jumpers, and adjustment controls.",
  },
  {
    id: "measurement",
    label: "measurement points",
    description: "Optional signal and power-rail test points.",
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
    evmOptions: {
      connectors: true,
      controls: !removedFeatureIds.includes("controls"),
      measurement: !removedFeatureIds.includes("measurement"),
    },
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
}): TiEvm {
  return {
    ...params,
    removableFeatures: evaluationFeatures,
    variants: createVariants({
      evmId: params.id,
      features: evaluationFeatures,
      createPopulation: createEvaluationOptions,
    }),
  }
}

export const tiEvms: TiEvm[] = [
  skAm62aLp,
  createEvaluationEvm({
    id: "bq25731evm",
    name: "BQ25731EVM",
    category: "1-to-5-cell buck-boost charger EVM",
    description: "I2C-controlled 16-A NVDC battery charger evaluation module.",
    sourceLabel: "TI BQ25731EVM reference",
    sourceUrl: "https://www.ti.com/tool/BQ25731EVM",
  }),
  createEvaluationEvm({
    id: "drv8210evm",
    name: "DRV8210EVM",
    category: "Low-voltage H-bridge motor-driver EVM",
    description: "Brushed-DC motor-driver evaluation module with selectable control access.",
    sourceLabel: "TI DRV8210EVM reference",
    sourceUrl: "https://www.ti.com/tool/DRV8210EVM",
  }),
  createEvaluationEvm({
    id: "lmk1c1104evm",
    name: "LMK1C1104EVM",
    category: "Low-jitter clock-buffer EVM",
    description: "Four-output LVCMOS fan-out clock-buffer evaluation module with 50-ohm outputs.",
    sourceLabel: "TI LMK1C1104EVM reference",
    sourceUrl: "https://www.ti.com/tool/LMK1C1104EVM",
  }),
  createEvaluationEvm({
    id: "tps62933pevm",
    name: "TPS62933PEVM",
    category: "3-A synchronous buck-converter EVM",
    description: "Configurable high-efficiency step-down converter evaluation module.",
    sourceLabel: "TI TPS62933PEVM reference",
    sourceUrl: "https://www.ti.com/tool/TPS62933PEVM",
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
