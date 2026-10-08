import type { ParameterizedTiEvmId, ParameterizedTiEvmOptions } from "./evms/parameterized-ti-evms"

export type TiEvmId = ParameterizedTiEvmId

export type TiEvmRemovableFeature = {
  id: string
  label: string
  description: string
  omittedSchematicSheetIndexes?: number[]
}

export type TiEvmVariant = {
  id: string
  label: string
  circuitJsonUrl: string
  schematicCircuitJsonUrls: string[]
  visibleSchematicSheetIndexes: number[]
  removedFeatureIds: string[]
  evmOptions: ParameterizedTiEvmOptions
}

export type TiEvm = {
  id: TiEvmId
  name: string
  category: string
  description: string
  sourceLabel: string
  sourceUrl: string
  sourcePath: string
  schematicSheetLabels: string[]
  removableFeatures: TiEvmRemovableFeature[]
  variants: TiEvmVariant[]
}

function createVariants(params: {
  evmId: TiEvmId
  features: TiEvmRemovableFeature[]
  schematicSheetCount: number
}): TiEvmVariant[] {
  const combinationCount = 1 << params.features.length

  return Array.from({ length: combinationCount }, (_, mask) => {
    const removedFeatures = params.features.filter((_, index) => mask & (1 << index))
    const removedFeatureIds = removedFeatures.map(({ id }) => id)
    const omittedSchematicSheetIndexes = new Set(
      removedFeatures.flatMap(
        ({ omittedSchematicSheetIndexes }) => omittedSchematicSheetIndexes ?? [],
      ),
    )
    const visibleSchematicSheetIndexes = Array.from(
      { length: params.schematicSheetCount },
      (_, schematicSheetIndex) => schematicSheetIndex,
    ).filter((schematicSheetIndex) => !omittedSchematicSheetIndexes.has(schematicSheetIndex))
    const isFullBoard = mask === 0
    const isMinimalBoard = mask === combinationCount - 1
    const id = isFullBoard
      ? "full-board"
      : isMinimalBoard
        ? "minimal-board"
        : `remove-${removedFeatureIds.join("-")}`

    const circuitJsonUrl = `/prebuilt-ti-evms/${params.evmId}/${id}.circuit.json.gz`

    return {
      id,
      label: createVariantLabel({
        features: params.features,
        removedFeatureIds,
      }),
      circuitJsonUrl,
      schematicCircuitJsonUrls: Array.from(
        { length: params.schematicSheetCount },
        (_, schematicSheetIndex) =>
          `/prebuilt-ti-evms/${params.evmId}/${id}${
            schematicSheetIndex === 0 ? ".schematic" : `.schematic-${schematicSheetIndex + 1}`
          }.circuit.json.gz`,
      ),
      visibleSchematicSheetIndexes,
      removedFeatureIds,
      evmOptions: { removedFeatureIds },
    }
  })
}

function createVariantLabel({
  features,
  removedFeatureIds,
}: {
  features: TiEvmRemovableFeature[]
  removedFeatureIds: string[]
}): string {
  if (removedFeatureIds.length === 0) return "Full board"
  if (removedFeatureIds.length === features.length) return "Minimal board"

  const includedFeatures = features.filter(({ id }) => !removedFeatureIds.includes(id))
  const label = includedFeatures.map(({ label: featureLabel }) => featureLabel).join(" + ")
  return `${label[0].toUpperCase()}${label.slice(1)} only`
}

function createEvaluationEvm(params: {
  id: ParameterizedTiEvmId
  name: string
  category: string
  description: string
  sourceLabel: string
  sourceUrl: string
  sourcePath: string
  schematicSheetLabels: string[]
  removableFeatures: TiEvmRemovableFeature[]
}): TiEvm {
  return {
    ...params,
    variants: createVariants({
      evmId: params.id,
      features: params.removableFeatures,
      schematicSheetCount: params.schematicSheetLabels.length,
    }),
  }
}

export const tiEvms: TiEvm[] = [
  createEvaluationEvm({
    id: "dp83825evm",
    name: "DP83825EVM",
    category: "Industrial Ethernet PHY EVM",
    description:
      "TI's 158-component 10/100-Mbps Ethernet PHY platform with RJ-45 and MAC interfaces, onboard USB-to-MDIO control, and compliance test access.",
    sourceLabel: "TI DP83825EVM Altium release",
    sourceUrl: "https://www.ti.com/tool/DP83825EVM",
    sourcePath: "boards/dp83825evm/index.circuit.tsx",
    schematicSheetLabels: [
      "HSDC045A_DP83825.SchDoc",
      "HSDC045A_Coms.SchDoc",
      "HSDC045A_Power.SchDoc",
      "HSDC045A_Hardware.SchDoc",
      "HSDC045A_CoverSheet.SchDoc",
    ],
    removableFeatures: [
      {
        id: "usb-mdio-controller",
        label: "USB-to-MDIO controller",
        description: "Optional MSP430F5529 USB management controller and support circuitry.",
        omittedSchematicSheetIndexes: [1],
      },
      {
        id: "status-indicators",
        label: "status indicators",
        description: "Optional link, activity, power, and controller status LEDs.",
      },
    ],
  }),
  createEvaluationEvm({
    id: "drv8307evm",
    name: "DRV8307EVM",
    category: "Three-phase BLDC pre-driver EVM",
    description:
      "TI's 84-component DRV8307/DRV8308 motor-control evaluation board with three external MOSFET half-bridges.",
    sourceLabel: "TI DRV8307EVM Altium release",
    sourceUrl: "https://www.ti.com/tool/DRV8307EVM",
    sourcePath: "boards/drv8307evm/index.circuit.tsx",
    schematicSheetLabels: ["DRV8307EVM RevA.SchDoc"],
    removableFeatures: [
      {
        id: "onboard-speed-control",
        label: "on-board speed control",
        description: "TLC555 PWM generator, speed potentiometer, and support components.",
      },
      {
        id: "hall-interface",
        label: "Hall-sensor interface",
        description: "Hall input conditioning and buffer devices.",
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
    schematicSheetLabels: ["BMC029A_SCH.SchDoc", "BMC029A-HW.SchDoc"],
    removableFeatures: [
      {
        id: "test-and-measurement",
        label: "test and measurement hardware",
        description: "Optional test points and oscilloscope probe access used during evaluation.",
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
    schematicSheetLabels: ["SR135B.SchDoc"],
    removableFeatures: [
      {
        id: "test-and-measurement",
        label: "test and measurement hardware",
        description:
          "Thirteen reference test points distributed across the power and control nets.",
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
    schematicSheetLabels: ["LMG342X_BB_EVM.SchDoc"],
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

export function getTiEvmVariantSchematicCircuitJsonUrls(variant: TiEvmVariant): string[] {
  return variant.visibleSchematicSheetIndexes.map(
    (schematicSheetIndex) => variant.schematicCircuitJsonUrls[schematicSheetIndex],
  )
}

export function getTiEvmVariantSchematicSheetLabels(evm: TiEvm, variant: TiEvmVariant): string[] {
  return variant.visibleSchematicSheetIndexes.map(
    (schematicSheetIndex) => evm.schematicSheetLabels[schematicSheetIndex],
  )
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
