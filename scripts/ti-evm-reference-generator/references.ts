import type { ReferenceInput } from "./types"

const dp83825StatusIndicatorComponents = new Set([
  "LD1",
  "LD2",
  "LD3",
  "LD4",
  "R4",
  "R28",
  "R30",
  "R32",
])

const dp83825ConfigurationComponents = new Set([
  "J2",
  "J3",
  "J4",
  "J5",
  "J6",
  "J7",
  "J8",
  "J9",
  "J13",
  "J14",
  "J16",
  "J17",
  "J18",
  "S1",
  "R9",
  "R10",
  "R11",
  "R12",
  "R13",
  "R14",
  "R15",
  "R16",
  "R17",
  "R18",
  "R19",
])

function getDp83825RemovableFeatureId(componentName: string): string | undefined {
  if (/^(?:U4|D2|J19|Y1|R(?:4[4-9]|5[0-4])|C(?:3\d|40))$/u.test(componentName)) {
    return "usb-mdio-controller"
  }
  if (dp83825StatusIndicatorComponents.has(componentName)) return "status-indicators"
  if (dp83825ConfigurationComponents.has(componentName)) return "configuration-headers"
  return undefined
}

const drvSpeedControlComponents = new Set([
  "U5",
  "R20",
  "D7",
  "D8",
  "C3",
  "C4",
  "C5",
  "R12",
  "R13",
  "R21",
])

const drvHallInterfaceComponents = new Set([
  "U7",
  "U8",
  "U9",
  "U11",
  "R1",
  "R2",
  "R3",
  "R4",
  "R5",
  "R6",
  "R7",
  "R8",
  "R9",
  "R10",
  "C6",
  "C7",
  "C8",
  "C9",
  "C20",
  "JP3",
  "JP5",
  "JP6",
  "JP6a",
  "JP7",
])

const lmgStatusIndicators = new Set([
  "LS_OC",
  "HS_OC",
  "LS_FLT",
  "HS_FLT",
  "HVIN_EN",
  "5V_EN",
  "R1",
  "R5",
  "R29",
  "R30",
])

const lmgMeasurementInterface = new Set([
  "TACH",
  "VAUX",
  "SW",
  "PWM_LS",
  "PWM_HS",
  "PGND5",
  "PGND4",
  "LS_FET_PWM",
  "HVOUT",
  "HVIN",
  "HS_FET_PWM",
  "AGND2",
  "AGND1",
  "ACMGND",
  "12V",
  "5V",
  "J14",
  "J15",
])

export const referenceInputs: ReferenceInput[] = [
  {
    id: "dp83825evm",
    autorouterVersion: "beta_pipeline7",
    componentName: "Dp83825Evm",
    exportName: "dp83825EvmDefinition",
    name: "DP83825EVM",
    sourceUrl: "https://www.ti.com/tool/DP83825EVM",
    archiveSha256: "563481585d9c44e325a46da7891650d70573fa74008de68f80e7fcc9010c388f",
    pcbPath: "tmp/references/dp83825/HSDC045A.PcbDoc",
    projectPath: "tmp/references/dp83825/HSDC045A.PrjPcb",
    schematicPaths: [
      "tmp/references/dp83825/HSDC045A_DP83825.SchDoc",
      "tmp/references/dp83825/HSDC045A_Coms.SchDoc",
      "tmp/references/dp83825/HSDC045A_Power.SchDoc",
      "tmp/references/dp83825/HSDC045A_Hardware.SchDoc",
      "tmp/references/dp83825/HSDC045A_CoverSheet.SchDoc",
    ],
    outputName: "dp83825evm.generated.ts",
    getRemovableFeatureId: getDp83825RemovableFeatureId,
  },
  {
    id: "drv8307evm",
    autorouterVersion: "beta_pipeline9",
    componentName: "Drv8307Evm",
    exportName: "drv8307EvmDefinition",
    name: "DRV8307EVM",
    sourceUrl: "https://www.ti.com/tool/DRV8307EVM",
    archiveSha256: "660117e30c1f12473f18d825a8318a5460a13025a7a6223689ac1f9afd3921d8",
    pcbPath: "tmp/references/drv8307/Board files/DRV8307EVM RevA.PcbDoc",
    projectPath: "tmp/references/drv8307/Board files/DRV8307EVM RevA.PrjPcb",
    schematicPaths: ["tmp/references/drv8307/Board files/DRV8307EVM RevA.SchDoc"],
    outputName: "drv8307evm.generated.ts",
    getRemovableFeatureId: (componentName) => {
      if (drvSpeedControlComponents.has(componentName)) return "onboard-speed-control"
      if (drvHallInterfaceComponents.has(componentName)) return "hall-interface"
      return undefined
    },
  },
  {
    id: "lm5155evm-fly",
    autorouterVersion: "beta_pipeline7",
    componentName: "Lm5155EvmFly",
    exportName: "lm5155EvmFlyDefinition",
    name: "LM5155EVM-FLY",
    sourceUrl: "https://www.ti.com/tool/LM5155EVM-FLY",
    archiveSha256: "e8a1573658d294c6b47c8cdd8833df2d50302ac242afe88ecb8e60ca2f80b215",
    pcbPath: "tmp/references/lm5155fly/BMC029A.PcbDoc",
    projectPath: "tmp/references/lm5155fly/BMC029A.PrjPcb",
    schematicPaths: [
      "tmp/references/lm5155fly/BMC029A_SCH.SchDoc",
      "tmp/references/lm5155fly/BMC029A-HW.SchDoc",
    ],
    outputName: "lm5155evm-fly.generated.ts",
    getRemovableFeatureId: (componentName) => {
      if (/^TP/u.test(componentName)) return "test-and-measurement"
      if (/^(?:J4|R26)$/u.test(componentName)) return "configuration-interface"
      return undefined
    },
  },
  {
    id: "lm251772evm-pd",
    autorouterVersion: "beta_pipeline7",
    componentName: "Lm251772EvmPd",
    exportName: "lm251772EvmPdDefinition",
    name: "LM251772EVM-PD",
    sourceUrl: "https://www.ti.com/tool/LM251772EVM-PD",
    archiveSha256: "d538f1bb6dc0976a1d0509faf0a9f6a7932fc1e80ed3730740272fb390e8516f",
    pcbPath: "tmp/references/lm251772/Altium_Files/SR135B.PcbDoc",
    projectPath: "tmp/references/lm251772/Altium_Files/SR135B.PrjPcb",
    schematicPaths: ["tmp/references/lm251772/Altium_Files/SR135B.SchDoc"],
    outputName: "lm251772evm-pd.generated.ts",
    getRemovableFeatureId: (componentName) => {
      if (/^TP/u.test(componentName)) return "test-and-measurement"
      if (/^(?:SH_)?JP/u.test(componentName)) return "configuration-jumpers"
      return undefined
    },
  },
  {
    id: "lmg342x-bb-evm",
    autorouterVersion: "beta_pipeline9",
    componentName: "Lmg342xBbEvm",
    exportName: "lmg342xBbEvmDefinition",
    name: "LMG342X-BB-EVM",
    sourceUrl: "https://www.ti.com/tool/LMG342X-BB-EVM",
    archiveSha256: "3aba23eea3b9c4751d55468e8716a2c95277b9cd581edc9ae8ef4fb058717b09",
    pcbPath: "tmp/references/lmg342x/LMG342X_BB_EVM.PcbDoc",
    projectPath: "tmp/references/lmg342x/LMG342X_BB_EVM.PrjPcb",
    schematicPaths: ["tmp/references/lmg342x/LMG342X_BB_EVM.SchDoc"],
    outputName: "lmg342x-bb-evm.generated.ts",
    getRemovableFeatureId: (componentName) => {
      if (lmgStatusIndicators.has(componentName)) return "status-indicators"
      if (lmgMeasurementInterface.has(componentName)) return "measurement-interface"
      return undefined
    },
  },
]
