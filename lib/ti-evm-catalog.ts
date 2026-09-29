import {
  allOptionalModules,
  minimalOptionalModules,
  type OptionalModuleSelection,
} from "./module-config"

export type TiEvmId = "sk-am62a-lp" | "tmds62levm" | "am62l-evse-dev-evm"

export type SchematicPage = {
  id: string
  label: string
  circuitJsonUrl: string
}

export type TiEvmVariant = {
  id: string
  label: string
  description: string
  pcbCircuitJsonUrl: string
  schematicCircuitJsonUrl?: string
  schematicPages?: SchematicPage[]
  sourceSelection?: OptionalModuleSelection
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

const am62aVariants: TiEvmVariant[] = [
  {
    id: "full-evaluation-kit",
    label: "Full evaluation kit",
    description: "Every interface and on-board evaluation feature from the TI design is populated.",
    pcbCircuitJsonUrl: "/prebuilt-ti-evms/sk-am62a-lp/full-evaluation-kit.circuit.json.gz",
    sourceSelection: { ...allOptionalModules },
  },
  {
    id: "vision-ai-camera",
    label: "Vision AI camera",
    description: "Camera, HDMI, storage, USB, Ethernet, debug, and board monitoring.",
    pcbCircuitJsonUrl: "/prebuilt-ti-evms/sk-am62a-lp/vision-ai-camera.circuit.json.gz",
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
    pcbCircuitJsonUrl: "/prebuilt-ti-evms/sk-am62a-lp/headless-edge-ai.circuit.json.gz",
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
    pcbCircuitJsonUrl: "/prebuilt-ti-evms/sk-am62a-lp/industrial-gateway.circuit.json.gz",
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
    pcbCircuitJsonUrl: "/prebuilt-ti-evms/sk-am62a-lp/minimum-bring-up.circuit.json.gz",
    sourceSelection: withSelection({ usb: true, debug: true, monitoring: true }),
  },
]

const tmds62lSchematicPages: SchematicPage[] = Array.from({ length: 57 }, (_, index) => {
  const sheetNumber = String(index + 1).padStart(2, "0")
  return {
    id: sheetNumber,
    label: `Sheet ${sheetNumber}`,
    circuitJsonUrl: `/prebuilt-ti-evms/tmds62levm/schematics/${sheetNumber}.circuit.json.gz`,
  }
})

const evseSchematicNames = [
  "Block Diagram",
  "CAN",
  "CHAdeMO",
  "Connectors",
  "GB-T",
  "Hardware",
  "IO",
  "MSPM0",
  "Pilot Interface",
  "PLC",
  "Plug Lock",
  "Power Analog",
  "Power Input Digital",
  "Serial",
  "Temperature Sense",
  "XDS110 Debug",
] as const

const evseSchematicPages: SchematicPage[] = evseSchematicNames.map((label) => {
  const id = label
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/(^-|-$)/g, "")
  return {
    id,
    label,
    circuitJsonUrl: `/prebuilt-ti-evms/am62l-evse-dev-evm/schematics/${id}.circuit.json.gz`,
  }
})

export const tiEvms: TiEvm[] = [
  {
    id: "sk-am62a-lp",
    name: "SK-AM62A-LP",
    category: "Vision AI processor EVM",
    description:
      "A 12-layer AM62A edge-AI starter kit reconstructed as parameterized tscircuit TSX.",
    sourceLabel: "TI SK-AM62A-LP design files",
    sourceUrl: "https://www.ti.com/tool/SK-AM62A-LP",
    variants: am62aVariants,
  },
  {
    id: "tmds62levm",
    name: "TMDS62LEVM",
    category: "AM62L processor EVM",
    description:
      "TI's full AM62L evaluation module: 1,585 components, 1,000 nets, and 57 schematic sheets.",
    sourceLabel: "TI TMDS62LEVM design files (SPRCAL9 Rev. B)",
    sourceUrl: "https://www.ti.com/tool/TMDS62LEVM",
    variants: [
      {
        id: "rev-b-reference",
        label: "Rev. B reference assembly",
        description: "Checksum-pinned conversion of TI's released SPRCAL9 Rev. B Altium project.",
        pcbCircuitJsonUrl: "/prebuilt-ti-evms/tmds62levm/pcb.circuit.json.gz",
        schematicPages: tmds62lSchematicPages,
      },
    ],
  },
  {
    id: "am62l-evse-dev-evm",
    name: "AM62L-EVSE-DEV-EVM",
    category: "EV charging controller EVM",
    description:
      "Universal AC/DC EVSE front-end with PLC, control pilot, CAN, GB/T, CHAdeMO, and safety interfaces.",
    sourceLabel: "TI AM62L-EVSE-DEV-EVM design files (SLVMEM2)",
    sourceUrl: "https://www.ti.com/tool/AM62L-EVSE-DEV-EVM",
    variants: [
      {
        id: "assembly-001",
        label: "Released assembly 001",
        description:
          "TI's released PROC219E1 assembly configuration from the official Altium project.",
        pcbCircuitJsonUrl: "/prebuilt-ti-evms/am62l-evse-dev-evm/pcb.circuit.json.gz",
        schematicPages: evseSchematicPages,
      },
    ],
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
