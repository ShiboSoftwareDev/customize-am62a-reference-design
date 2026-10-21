type ComponentPinKey = string
type ComponentName = string
type NetName = string
type PinName = string

export type AllegroPadNetAssignment = {
  componentName: ComponentName
  netName: NetName
  pinName: PinName
}

export type AllegroPadNetAssignmentsByComponentPin = Map<ComponentPinKey, AllegroPadNetAssignment>

const nodeSectionHeader = "A!NET_NAME_SORT!NODE_SORT!NET_NAME!REFDES!PIN_NUMBER!PIN_NAME!SUBCLASS!"

export function getComponentPinKey(params: {
  componentName: ComponentName
  pinName: PinName
}): ComponentPinKey {
  return `${params.componentName}:${params.pinName}`
}

export function parseAllegroPadNetAssignments(
  allegroAsciiExport: string,
): AllegroPadNetAssignmentsByComponentPin {
  const nodeSectionStart = allegroAsciiExport.indexOf(nodeSectionHeader)
  if (nodeSectionStart < 0) {
    throw new Error("Allegro ASCII export has no node section")
  }

  const assignmentsByComponentPin: AllegroPadNetAssignmentsByComponentPin = new Map()
  const nodeSection = allegroAsciiExport.slice(nodeSectionStart + nodeSectionHeader.length)
  for (const rawLine of nodeSection.split(/\r?\n/u)) {
    const line = rawLine.trim()
    if (line.startsWith("A!")) break
    if (!line.startsWith("S!")) continue

    const fields = line.split("!")
    const netName = fields[3]
    const componentName = fields[4]
    const pinName = fields[5]
    if (!netName || !componentName || !pinName) continue

    const componentPinKey = getComponentPinKey({ componentName, pinName })
    const existingAssignment = assignmentsByComponentPin.get(componentPinKey)
    if (existingAssignment && existingAssignment.netName !== netName) {
      throw new Error(
        `Allegro ASCII export assigns ${componentPinKey} to both ${existingAssignment.netName} and ${netName}`,
      )
    }
    assignmentsByComponentPin.set(componentPinKey, {
      componentName,
      netName,
      pinName,
    })
  }

  if (assignmentsByComponentPin.size === 0) {
    throw new Error("Allegro ASCII export node section has no pad net assignments")
  }
  return assignmentsByComponentPin
}
