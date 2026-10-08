import type { ParameterizedTiEvmId, ParameterizedTiEvmOptions } from "./evms/parameterized-ti-evms"
import { tiEvmVariantDefinitions, type TiEvmVariantDefinition } from "./ti-evm-variant-definitions"

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
  variantDefinitions: TiEvmVariantDefinition[]
}): TiEvmVariant[] {
  const featureIds = new Set(params.features.map(({ id }) => id))

  return params.variantDefinitions.map((variantDefinition) => {
    for (const removedFeatureId of variantDefinition.removedFeatureIds) {
      if (!featureIds.has(removedFeatureId)) {
        throw new Error(`${params.evmId} variant references unknown feature: ${removedFeatureId}`)
      }
    }
    const removedFeatures = params.features.filter(({ id }) =>
      variantDefinition.removedFeatureIds.includes(id),
    )
    const omittedSchematicSheetIndexes = new Set(
      removedFeatures.flatMap(
        ({ omittedSchematicSheetIndexes }) => omittedSchematicSheetIndexes ?? [],
      ),
    )
    const visibleSchematicSheetIndexes = Array.from(
      { length: params.schematicSheetCount },
      (_, schematicSheetIndex) => schematicSheetIndex,
    ).filter((schematicSheetIndex) => !omittedSchematicSheetIndexes.has(schematicSheetIndex))
    const circuitJsonUrl = `/prebuilt-ti-evms/${params.evmId}/${variantDefinition.id}.circuit.json.gz`

    return {
      id: variantDefinition.id,
      label: variantDefinition.label,
      circuitJsonUrl,
      schematicCircuitJsonUrls: Array.from(
        { length: params.schematicSheetCount },
        (_, schematicSheetIndex) =>
          `/prebuilt-ti-evms/${params.evmId}/${variantDefinition.id}${
            schematicSheetIndex === 0 ? ".schematic" : `.schematic-${schematicSheetIndex + 1}`
          }.circuit.json.gz`,
      ),
      visibleSchematicSheetIndexes,
      removedFeatureIds: variantDefinition.removedFeatureIds,
      evmOptions: { removedFeatureIds: variantDefinition.removedFeatureIds },
    }
  })
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
      variantDefinitions: tiEvmVariantDefinitions[params.id],
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
        id: "power-indicator",
        label: "power indicator",
        description: "Optional board power LED and current-limiting resistor.",
      },
      {
        id: "phy-status-indicators",
        label: "PHY status indicators",
        description: "Optional PHY clock, strap, and interface status LEDs.",
      },
      {
        id: "clock-test-access",
        label: "clock test access",
        description: "Optional clock output and external reference clock SMA access.",
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
        id: "single-ended-hall-conditioning",
        label: "single-ended Hall conditioning",
        description: "Optional conditioning used for single-ended Hall sensors.",
      },
      {
        id: "test-points",
        label: "test points",
        description: "Optional test points for Hall, control, fault, and ground signals.",
      },
      {
        id: "status-indicators",
        label: "status indicators",
        description: "Optional power and fault LEDs.",
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
        id: "power-measurement-access",
        label: "power measurement access",
        description: "Optional input, output, ground, and switch-node probe points.",
      },
      {
        id: "control-loop-access",
        label: "control and loop access",
        description: "Optional control-signal header and loop-response injection points.",
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
        id: "power-measurement-access",
        label: "power measurement access",
        description: "Optional power-stage voltage, ground, and switch-node access.",
      },
      {
        id: "control-debug-access",
        label: "control debug access",
        description: "Optional controller rail, reset, compensation, soft-start, and CDC access.",
      },
      {
        id: "usb2any-interface",
        label: "USB2ANY interface",
        description: "Optional USB2ANY I2C header and its connector-side pull-up resistors.",
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
        id: "logic-measurement-access",
        label: "logic measurement access",
        description: "Optional PWM, gate-drive, tachometer, and analog-ground probe points.",
      },
      {
        id: "power-measurement-access",
        label: "power measurement access",
        description: "Optional high-voltage input, output, switch-node, and power-ground probes.",
      },
      {
        id: "bias-measurement-access",
        label: "bias measurement access",
        description: "Optional 12-V, 5-V, auxiliary, and common-mode ground probes.",
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
