export const requiredModuleIds = [
  "powerInput",
  "systemPower",
  "pmic",
  "processorSupport",
  "lpddr4",
  "oscillator",
  "reset",
  "bootMode",
] as const

export const optionalModuleGroups = [
  { id: "storage", label: "Storage", modules: ["emmc", "sdCard", "ospi"] },
  { id: "ethernet", label: "Ethernet", modules: ["ethernet1", "ethernet2"] },
  { id: "wireless", label: "Wireless", modules: ["m2"] },
  { id: "usb", label: "USB", modules: ["usbHost", "usbDrd"] },
  {
    id: "debug",
    label: "Debug & serial",
    modules: ["xds110", "jtag", "usbUart", "testAutomation"],
  },
  {
    id: "expansion",
    label: "Expansion",
    modules: ["expansion", "mcuHeader", "wakeGpmc", "canWake"],
  },
  { id: "camera", label: "Camera", modules: ["camera"] },
  { id: "audio", label: "Audio", modules: ["audio"] },
  { id: "display", label: "HDMI", modules: ["hdmi"] },
  {
    id: "monitoring",
    label: "Monitoring & test points",
    modules: ["powerMonitor", "boardId", "testPoints"],
  },
] as const

export type OptionalModuleGroupId = (typeof optionalModuleGroups)[number]["id"]
export type OptionalModuleSelection = Record<OptionalModuleGroupId, boolean>
export type ModuleFlags = Record<string, boolean>

export const allOptionalModules: OptionalModuleSelection = Object.fromEntries(
  optionalModuleGroups.map(({ id }) => [id, true]),
) as OptionalModuleSelection

export const minimalOptionalModules: OptionalModuleSelection = Object.fromEntries(
  optionalModuleGroups.map(({ id }) => [id, false]),
) as OptionalModuleSelection

export function deriveModuleFlags(selection: OptionalModuleSelection): ModuleFlags {
  const flags: ModuleFlags = {}

  for (const { id, modules } of optionalModuleGroups) {
    for (const moduleId of modules) flags[moduleId] = selection[id]
  }

  for (const moduleId of requiredModuleIds) flags[moduleId] = true

  flags.peripheralPower =
    selection.ethernet ||
    selection.display ||
    selection.usb ||
    selection.expansion ||
    selection.camera ||
    selection.audio ||
    selection.wireless
  flags.ethernetClock = selection.ethernet
  flags.uartSwitch = selection.debug || selection.wireless || selection.expansion
  flags.ioExpander =
    selection.storage ||
    selection.wireless ||
    selection.camera ||
    selection.audio ||
    selection.display ||
    selection.expansion
  flags.mechanical = selection.expansion
  flags.boardExtras = selection.expansion
  flags.addPours = false
  flags.renderSchematic = true

  return flags
}

export function getSelectionCacheKey(request: {
  selection: OptionalModuleSelection
  addPours: boolean
}): string {
  return JSON.stringify({
    ...Object.fromEntries(optionalModuleGroups.map(({ id }) => [id, request.selection[id]])),
    addPours: request.addPours,
  })
}
