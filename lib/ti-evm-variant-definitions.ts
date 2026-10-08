import type { ParameterizedTiEvmId } from "./evms/parameterized-ti-evms"

export type TiEvmVariantDefinition = {
  id: string
  label: string
  removedFeatureIds: string[]
}

export const tiEvmVariantDefinitions = {
  dp83825evm: [
    { id: "full-board", label: "Full board", removedFeatureIds: [] },
    {
      id: "without-power-indicator",
      label: "Without power indicator",
      removedFeatureIds: ["power-indicator"],
    },
    {
      id: "without-phy-status-indicators",
      label: "Without PHY status indicators",
      removedFeatureIds: ["phy-status-indicators"],
    },
    {
      id: "without-status-indicators",
      label: "Without status indicators",
      removedFeatureIds: ["power-indicator", "phy-status-indicators"],
    },
    {
      id: "usb-managed-core",
      label: "USB-managed core",
      removedFeatureIds: ["power-indicator", "phy-status-indicators", "clock-test-access"],
    },
    {
      id: "external-mdio-evaluation",
      label: "External MDIO evaluation",
      removedFeatureIds: ["usb-mdio-controller"],
    },
    {
      id: "minimal-board",
      label: "Minimal board",
      removedFeatureIds: [
        "usb-mdio-controller",
        "power-indicator",
        "phy-status-indicators",
        "clock-test-access",
      ],
    },
  ],
  drv8307evm: [
    { id: "full-board", label: "Full board", removedFeatureIds: [] },
    {
      id: "external-pwm",
      label: "External PWM",
      removedFeatureIds: ["onboard-speed-control"],
    },
    {
      id: "differential-hall",
      label: "Differential Hall inputs",
      removedFeatureIds: ["single-ended-hall-conditioning"],
    },
    {
      id: "without-status-indicators",
      label: "Without status indicators",
      removedFeatureIds: ["status-indicators"],
    },
    {
      id: "external-pwm-differential-hall",
      label: "External PWM + differential Hall",
      removedFeatureIds: ["onboard-speed-control", "single-ended-hall-conditioning"],
    },
    {
      id: "minimal-board",
      label: "Minimal board",
      removedFeatureIds: [
        "onboard-speed-control",
        "single-ended-hall-conditioning",
        "test-points",
        "status-indicators",
      ],
    },
  ],
  "lm5155evm-fly": [
    { id: "full-board", label: "Full board", removedFeatureIds: [] },
    {
      id: "without-power-measurement",
      label: "Without power measurement access",
      removedFeatureIds: ["power-measurement-access"],
    },
    {
      id: "without-control-loop-access",
      label: "Without control and loop access",
      removedFeatureIds: ["control-loop-access"],
    },
    {
      id: "minimal-board",
      label: "Minimal board",
      removedFeatureIds: ["power-measurement-access", "control-loop-access"],
    },
  ],
  "lm251772evm-pd": [
    { id: "full-board", label: "Full board", removedFeatureIds: [] },
    {
      id: "without-power-measurement",
      label: "Without power measurement access",
      removedFeatureIds: ["power-measurement-access"],
    },
    {
      id: "without-usb2any-interface",
      label: "Without USB2ANY interface",
      removedFeatureIds: ["usb2any-interface"],
    },
    {
      id: "without-measurement-access",
      label: "Without measurement access",
      removedFeatureIds: ["power-measurement-access", "control-debug-access"],
    },
    {
      id: "control-debug-only",
      label: "Control debug access only",
      removedFeatureIds: ["power-measurement-access", "usb2any-interface"],
    },
    {
      id: "minimal-board",
      label: "Minimal board",
      removedFeatureIds: ["power-measurement-access", "control-debug-access", "usb2any-interface"],
    },
  ],
  "lmg342x-bb-evm": [
    { id: "full-board", label: "Full board", removedFeatureIds: [] },
    {
      id: "without-logic-measurement",
      label: "Without logic measurement access",
      removedFeatureIds: ["logic-measurement-access"],
    },
    {
      id: "without-power-measurement",
      label: "Without power measurement access",
      removedFeatureIds: ["power-measurement-access"],
    },
    {
      id: "without-bias-measurement",
      label: "Without bias measurement access",
      removedFeatureIds: ["bias-measurement-access"],
    },
    {
      id: "without-status-indicators",
      label: "Without status indicators",
      removedFeatureIds: ["status-indicators"],
    },
    {
      id: "without-measurement-access",
      label: "Without measurement access",
      removedFeatureIds: [
        "logic-measurement-access",
        "power-measurement-access",
        "bias-measurement-access",
      ],
    },
    {
      id: "logic-diagnostics-only",
      label: "Logic diagnostics only",
      removedFeatureIds: [
        "power-measurement-access",
        "bias-measurement-access",
        "status-indicators",
      ],
    },
    {
      id: "minimal-board",
      label: "Minimal board",
      removedFeatureIds: [
        "logic-measurement-access",
        "power-measurement-access",
        "bias-measurement-access",
        "status-indicators",
      ],
    },
  ],
} satisfies Record<ParameterizedTiEvmId, TiEvmVariantDefinition[]>
