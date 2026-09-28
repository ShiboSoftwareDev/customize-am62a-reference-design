import {
  optionalModuleGroups,
  type OptionalModuleGroupId,
  type OptionalModuleSelection,
} from "lib/module-config"

export type BoardPreset = {
  id: string
  label: string
  description: string
  selection: OptionalModuleSelection
}

function createOptionalModuleSelection(
  enabledModuleGroupIds: OptionalModuleGroupId[],
): OptionalModuleSelection {
  const enabledModuleGroups = new Set(enabledModuleGroupIds)
  return Object.fromEntries(
    optionalModuleGroups.map(({ id }) => [id, enabledModuleGroups.has(id)]),
  ) as OptionalModuleSelection
}

export const boardPresets: BoardPreset[] = [
  {
    id: "full_evaluation",
    label: "Full evaluation",
    description: "Every optional interface and validation feature.",
    selection: createOptionalModuleSelection(optionalModuleGroups.map(({ id }) => id)),
  },
  {
    id: "minimal_compute",
    label: "Minimal compute",
    description: "Required compute, memory, power, clock, reset, and boot circuitry only.",
    selection: createOptionalModuleSelection([]),
  },
  {
    id: "vision_ai",
    label: "Vision AI",
    description: "Camera capture with local storage, wired networking, USB, and debug.",
    selection: createOptionalModuleSelection([
      "storage",
      "ethernet",
      "usb",
      "debug",
      "camera",
      "monitoring",
    ]),
  },
  {
    id: "video_analytics",
    label: "Video analytics",
    description: "Camera input, HDMI output, networking, and monitoring for video workloads.",
    selection: createOptionalModuleSelection([
      "storage",
      "ethernet",
      "usb",
      "camera",
      "display",
      "monitoring",
    ]),
  },
  {
    id: "industrial_gateway",
    label: "Industrial gateway",
    description: "Wired and wireless networking with field expansion and service access.",
    selection: createOptionalModuleSelection([
      "storage",
      "ethernet",
      "wireless",
      "usb",
      "debug",
      "expansion",
      "monitoring",
    ]),
  },
  {
    id: "wireless_edge",
    label: "Wireless edge",
    description: "Compact wireless compute with storage, USB, expansion, and debug.",
    selection: createOptionalModuleSelection(["storage", "wireless", "usb", "debug", "expansion"]),
  },
  {
    id: "multimedia_terminal",
    label: "Multimedia terminal",
    description: "HDMI, audio, wireless, USB, storage, and expansion for an interactive terminal.",
    selection: createOptionalModuleSelection([
      "storage",
      "wireless",
      "usb",
      "expansion",
      "audio",
      "display",
      "monitoring",
    ]),
  },
  {
    id: "camera_streamer",
    label: "Camera streamer",
    description: "Camera with wired and wireless uplinks plus USB and health monitoring.",
    selection: createOptionalModuleSelection([
      "ethernet",
      "wireless",
      "usb",
      "camera",
      "monitoring",
    ]),
  },
  {
    id: "validation_bench",
    label: "Validation bench",
    description: "Broad I/O coverage with debug and monitoring, without the wireless module.",
    selection: createOptionalModuleSelection([
      "storage",
      "ethernet",
      "usb",
      "debug",
      "expansion",
      "camera",
      "audio",
      "display",
      "monitoring",
    ]),
  },
  {
    id: "production_camera",
    label: "Production camera",
    description: "Focused camera design with storage, Ethernet, USB, expansion, and monitoring.",
    selection: createOptionalModuleSelection([
      "storage",
      "ethernet",
      "usb",
      "expansion",
      "camera",
      "monitoring",
    ]),
  },
]

export function findMatchingBoardPreset(
  selection: OptionalModuleSelection,
): BoardPreset | undefined {
  return boardPresets.find((preset) =>
    optionalModuleGroups.every(({ id }) => preset.selection[id] === selection[id]),
  )
}
