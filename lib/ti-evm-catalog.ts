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
  prebuiltCadSceneUrl: string
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
  unavailableSchematicSheetLabels?: string[]
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
      prebuiltCadSceneUrl: `/prebuilt-ti-evms/${params.evmId}/${variantDefinition.id}.glb`,
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
  unavailableSchematicSheetLabels?: string[]
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
    id: "tmds62levm",
    name: "TMDS62LEVM",
    category: "Sitara AM62L evaluation module",
    description:
      "TI's AM62L evaluation module with LPDDR4, dual Ethernet, M.2 wireless expansion, display, audio, and extensive current-monitoring and debug circuitry.",
    sourceLabel: "TI TMDS62LEVM Altium release",
    sourceUrl: "https://www.ti.com/tool/TMDS62LEVM",
    sourcePath: "boards/tmds62levm/index.circuit.tsx",
    schematicSheetLabels: createNumberedSchematicSheetLabels(57),
    removableFeatures: [
      {
        id: "connectivity",
        label: "M.2 and Ethernet connectivity",
        description: "M.2 SDIO and dual-Ethernet interface circuitry.",
        omittedSchematicSheetIndexes: [27, 31, 32, 33],
      },
      {
        id: "multimedia",
        label: "HDMI and audio",
        description: "HDMI display output and audio interface circuitry.",
        omittedSchematicSheetIndexes: [38, 39],
      },
      {
        id: "expansion",
        label: "display and control expansion",
        description: "DSI display and MCAN/GPIO expansion interfaces.",
        omittedSchematicSheetIndexes: [41, 42],
      },
      {
        id: "debug-instrumentation",
        label: "debug and current instrumentation",
        description: "Current monitors, test access, and debug support circuitry.",
        omittedSchematicSheetIndexes: [46, 47, 48, 49, 50, 51, 52, 53, 54, 55],
      },
    ],
  }),
  createEvaluationEvm({
    id: "sk-am62",
    name: "SK-AM62",
    category: "Sitara AM62x starter kit",
    description:
      "TI's AM62x starter kit with LPDDR4, eMMC and microSD storage, dual Ethernet, Wi-Fi, display, camera, audio, and expansion interfaces.",
    sourceLabel: "TI SK-AM62 design release",
    sourceUrl: "https://www.ti.com/tool/SK-AM62",
    sourcePath: "boards/sk-am62/index.circuit.tsx",
    schematicSheetLabels: createNumberedSchematicSheetLabels(44),
    // The source importer could not recover the embedded OrCAD diagrams.
    unavailableSchematicSheetLabels: createNumberedSchematicSheetLabels(8).slice(2),
    removableFeatures: [
      {
        id: "connectivity",
        label: "wireless and Ethernet connectivity",
        description: "Wireless module and dual-Ethernet interface circuitry.",
        omittedSchematicSheetIndexes: [16, 21, 22, 23],
      },
      {
        id: "test-debug",
        label: "test and debug",
        description: "Board test, measurement, and debug support circuitry.",
        omittedSchematicSheetIndexes: [24, 26, 27, 28, 29, 30],
      },
      {
        id: "expansion",
        label: "expansion interfaces",
        description: "Header and peripheral expansion circuitry.",
        omittedSchematicSheetIndexes: [31, 32, 33],
      },
      {
        id: "multimedia",
        label: "display, camera, and audio",
        description: "Multimedia display, camera, and audio interfaces.",
        omittedSchematicSheetIndexes: [36, 37, 38, 39, 40],
      },
    ],
  }),
  createEvaluationEvm({
    id: "beagleplay",
    name: "BeaglePlay",
    category: "Sitara AM625 development platform",
    description:
      "The official AM625 BeaglePlay design with DDR4, eMMC, dual Ethernet, Wi-Fi, Sub-1 GHz radio, HDMI, camera, USB, and mikroBUS/Grove expansion.",
    sourceLabel: "BeaglePlay official Altium release",
    sourceUrl: "https://www.beagleboard.org/boards/beagleplay",
    sourcePath: "boards/beagleplay/index.circuit.tsx",
    schematicSheetLabels: [
      "001_Revision History.SchDoc",
      "002_Block Diagram.SchDoc",
      "003_Power Tree.SchDoc",
      "004_I2C Usage Diagram.SchDoc",
      "005_DCDC & PMIC.SchDoc",
      "006_SoC Power.SchDoc",
      "007_SoC DCAPs.SchDoc",
      "008_SoC DDR & DDR4.SchDoc",
      "009_SoC SDIO & eMMC & SD.SchDoc",
      "010_SoC RGMII & GBE PHY.SchDoc",
      "011_SoC RMII & SPE PHY.SchDoc",
      "012_SoC DDS & HDMI.SchDoc",
      "013_SoC GPIO 3.3V.SchDoc",
      "014_SoC GPIO 1.8V & Bootstrap.SchDoc",
      "015_SoC USB & USB_A & USB_C.SchDoc",
      "016_SoC Reset & MCU.SchDoc",
      "017_SoC CSI & OLDI.SchDoc",
      "018_RTC & ID & DEBUG.SchDoc",
      "019_CC1352P.SchDoc",
      "020_WiFi WL1807MOD.SchDoc",
      "021_BUTTONs & LEDs.SchDoc",
      "022_GROVE &QWIIC &MikroBus &ADC.SchDoc",
    ],
    removableFeatures: [
      {
        id: "wired-networking",
        label: "wired networking",
        description: "Gigabit Ethernet and single-pair Ethernet interfaces.",
        omittedSchematicSheetIndexes: [9, 10],
      },
      {
        id: "display-camera",
        label: "display and camera",
        description: "HDMI, CSI camera, and OLDI display interfaces.",
        omittedSchematicSheetIndexes: [11, 16],
      },
      {
        id: "wireless",
        label: "wireless connectivity",
        description: "CC1352P Sub-1 GHz and WL1807MOD Wi-Fi circuitry.",
        omittedSchematicSheetIndexes: [18, 19],
      },
      {
        id: "user-io",
        label: "user I/O and expansion",
        description: "Buttons, LEDs, Grove, Qwiic, mikroBUS, and ADC expansion.",
        omittedSchematicSheetIndexes: [20, 21],
      },
    ],
  }),
  createEvaluationEvm({
    id: "beaglebone-black",
    name: "BeagleBone Black",
    category: "Sitara AM3358 development platform",
    description:
      "The official AM3358 BeagleBone Black design with DDR3, eMMC, microSD, Ethernet, HDMI, USB, and dual expansion headers.",
    sourceLabel: "BeagleBone Black official Altium release",
    sourceUrl: "https://www.beagleboard.org/boards/beaglebone-black",
    sourcePath: "boards/beaglebone-black/index.circuit.tsx",
    schematicSheetLabels: [
      "P01_Title Page.SchDoc",
      "P02_Power Management.SchDoc",
      "P03_Processor 1 of 3, JTAG Header.SchDoc",
      "P04_Processor 2 or 3, USB and Serial.SchDoc",
      "P05_Processor Page 3 of 3.SchDoc",
      "P06_LED, Config, & Button.SchDoc",
      "P07_DDR3 Memory.SchDoc",
      "P08_eMMC.SchDoc",
      "P09_Ethernet.SchDoc",
      "P10_HDMI Framer.SchDoc",
      "P11_Exp Conn, uSD, and .SchDoc",
    ],
    removableFeatures: [
      {
        id: "emmc",
        label: "eMMC storage",
        description: "Onboard eMMC storage and support circuitry.",
        omittedSchematicSheetIndexes: [7],
      },
      {
        id: "ethernet",
        label: "Ethernet",
        description: "10/100 Ethernet PHY and connector circuitry.",
        omittedSchematicSheetIndexes: [8],
      },
      {
        id: "hdmi",
        label: "HDMI output",
        description: "HDMI framer and display output circuitry.",
        omittedSchematicSheetIndexes: [9],
      },
    ],
  }),
]

function createNumberedSchematicSheetLabels(count: number): string[] {
  return Array.from(
    { length: count },
    (_, sheetIndex) => `${String(sheetIndex + 1).padStart(2, "0")}.SchDoc`,
  )
}

export function getTiEvm(evmId: TiEvmId): TiEvm {
  const evm = tiEvms.find(({ id }) => id === evmId)
  if (!evm) throw new Error(`Unknown Sitara board: ${evmId}`)
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
