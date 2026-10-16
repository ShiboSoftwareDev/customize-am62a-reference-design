import { BeagleBoneBlack as GeneratedBeagleBoneBlack } from "../../lib/generated/ti-evms/beaglebone-black.circuit"

export type BeagleBoneBlackVariant =
  | "full-board"
  | "without-emmc"
  | "without-ethernet"
  | "without-hdmi"
  | "minimal-board"

const removedFeatureIdsByVariant: Record<BeagleBoneBlackVariant, string[]> = {
  "full-board": [],
  "without-emmc": ["emmc"],
  "without-ethernet": ["ethernet"],
  "without-hdmi": ["hdmi"],
  "minimal-board": ["emmc", "ethernet", "hdmi"],
}

export function BeagleBoneBlack(props: { variant?: BeagleBoneBlackVariant }) {
  return (
    <GeneratedBeagleBoneBlack
      removedFeatureIds={removedFeatureIdsByVariant[props.variant ?? "full-board"]}
    />
  )
}

export default () => <BeagleBoneBlack />
