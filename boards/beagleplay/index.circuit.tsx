import { BeaglePlay as GeneratedBeaglePlay } from "../../lib/generated/ti-evms/beagleplay.circuit"

export type BeaglePlayVariant =
  | "full-board"
  | "without-wired-networking"
  | "without-display-camera"
  | "without-wireless"
  | "without-user-io"
  | "minimal-board"

const removedFeatureIdsByVariant: Record<BeaglePlayVariant, string[]> = {
  "full-board": [],
  "without-wired-networking": ["wired-networking"],
  "without-display-camera": ["display-camera"],
  "without-wireless": ["wireless"],
  "without-user-io": ["user-io"],
  "minimal-board": ["wired-networking", "display-camera", "wireless", "user-io"],
}

export function BeaglePlay(props: { variant?: BeaglePlayVariant }) {
  return (
    <GeneratedBeaglePlay
      removedFeatureIds={removedFeatureIdsByVariant[props.variant ?? "full-board"]}
    />
  )
}

export default () => <BeaglePlay />
