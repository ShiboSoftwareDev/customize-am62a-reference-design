import { AM62ABoard } from "../../lib/generated/am62a-board"
import {
  allOptionalModules,
  deriveModuleFlags,
  type OptionalModuleSelection,
} from "../../lib/module-config"

export type SkAm62aLpProps = {
  removeVisionMedia?: boolean
  removeNetworkIo?: boolean
  removeStorageDiagnostics?: boolean
}

export function SkAm62aLp(props: SkAm62aLpProps) {
  const selection: OptionalModuleSelection = { ...allOptionalModules }

  if (props.removeVisionMedia) {
    selection.camera = false
    selection.display = false
    selection.audio = false
  }
  if (props.removeNetworkIo) {
    selection.ethernet = false
    selection.wireless = false
    selection.usb = false
    selection.expansion = false
  }
  if (props.removeStorageDiagnostics) {
    selection.storage = false
    selection.debug = false
    selection.monitoring = false
  }

  return <AM62ABoard flags={deriveModuleFlags(selection)} />
}

export default () => <SkAm62aLp />
