import { SkAm62 as GeneratedSkAm62 } from "../../lib/generated/ti-evms/sk-am62.circuit"

export type SkAm62Variant =
  | "full-board"
  | "without-connectivity"
  | "without-test-debug"
  | "without-expansion"
  | "without-multimedia"
  | "minimal-board"

const removedFeatureIdsByVariant: Record<SkAm62Variant, string[]> = {
  "full-board": [],
  "without-connectivity": ["connectivity"],
  "without-test-debug": ["test-debug"],
  "without-expansion": ["expansion"],
  "without-multimedia": ["multimedia"],
  "minimal-board": ["connectivity", "test-debug", "expansion", "multimedia"],
}

export function SkAm62(props: { variant?: SkAm62Variant }) {
  return (
    <GeneratedSkAm62
      removedFeatureIds={removedFeatureIdsByVariant[props.variant ?? "full-board"]}
    />
  )
}

export default () => <SkAm62 />
