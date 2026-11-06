import type { ParameterizedTiEvmId } from "./evms/parameterized-ti-evms"

export type TiEvmVariantDefinition = {
  id: string
  label: string
  removedFeatureIds: string[]
}

export const tiEvmVariantDefinitions = {
  tmds62levm: [
    { id: "full-board", label: "Full board", removedFeatureIds: [] },
    {
      id: "without-connectivity",
      label: "Without M.2 and Ethernet connectivity",
      removedFeatureIds: ["connectivity"],
    },
    {
      id: "without-multimedia",
      label: "Without HDMI and audio",
      removedFeatureIds: ["multimedia"],
    },
    {
      id: "without-expansion",
      label: "Without display and control expansion",
      removedFeatureIds: ["expansion"],
    },
    {
      id: "without-debug-instrumentation",
      label: "Without debug and current instrumentation",
      removedFeatureIds: ["debug-instrumentation", "uart-console"],
    },
    {
      id: "minimal-board",
      label: "Minimal board",
      removedFeatureIds: [
        "connectivity",
        "multimedia",
        "expansion",
        "debug-instrumentation",
        "secondary-storage-and-usb",
      ],
    },
  ],
  "sk-am62": [
    { id: "full-board", label: "Full board", removedFeatureIds: [] },
    {
      id: "without-connectivity",
      label: "Without wireless and Ethernet connectivity",
      removedFeatureIds: ["connectivity"],
    },
    {
      id: "without-test-debug",
      label: "Without test and debug",
      removedFeatureIds: ["test-debug", "uart-console"],
    },
    {
      id: "without-expansion",
      label: "Without expansion interfaces",
      removedFeatureIds: ["expansion"],
    },
    {
      id: "without-multimedia",
      label: "Without display, camera, and audio",
      removedFeatureIds: ["multimedia"],
    },
    {
      id: "minimal-board",
      label: "Minimal board",
      removedFeatureIds: [
        "connectivity",
        "test-debug",
        "expansion",
        "multimedia",
        "secondary-storage-and-usb",
      ],
    },
  ],
  beagleplay: [
    { id: "full-board", label: "Full board", removedFeatureIds: [] },
    {
      id: "without-wired-networking",
      label: "Without wired networking",
      removedFeatureIds: ["wired-networking"],
    },
    {
      id: "without-display-camera",
      label: "Without display and camera",
      removedFeatureIds: ["display-camera"],
    },
    {
      id: "without-wireless",
      label: "Without wireless connectivity",
      removedFeatureIds: ["wireless"],
    },
    {
      id: "without-user-io",
      label: "Without user I/O and expansion",
      removedFeatureIds: ["user-io"],
    },
    {
      id: "minimal-board",
      label: "Minimal board",
      removedFeatureIds: [
        "wired-networking",
        "display-camera",
        "wireless",
        "user-io",
        "secondary-storage-and-usb",
      ],
    },
  ],
  "beaglebone-black": [
    { id: "full-board", label: "Full board", removedFeatureIds: [] },
    {
      id: "without-emmc",
      label: "Without eMMC storage",
      removedFeatureIds: ["emmc"],
    },
    {
      id: "without-ethernet",
      label: "Without Ethernet",
      removedFeatureIds: ["ethernet"],
    },
    {
      id: "without-hdmi",
      label: "Without HDMI output",
      removedFeatureIds: ["hdmi"],
    },
    {
      id: "minimal-board",
      label: "Minimal board",
      removedFeatureIds: ["emmc", "ethernet", "hdmi", "expansion-and-usb"],
    },
  ],
} satisfies Record<ParameterizedTiEvmId, TiEvmVariantDefinition[]>
