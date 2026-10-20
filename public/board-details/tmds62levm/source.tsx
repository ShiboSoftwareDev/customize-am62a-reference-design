import { Tmds62lEvm as GeneratedTmds62lEvm } from "../../lib/generated/ti-evms/tmds62levm.circuit"

export type Tmds62lEvmVariant =
  | "full-board"
  | "without-connectivity"
  | "without-multimedia"
  | "without-expansion"
  | "without-debug-instrumentation"
  | "minimal-board"

const removedFeatureIdsByVariant: Record<Tmds62lEvmVariant, string[]> = {
  "full-board": [],
  "without-connectivity": ["connectivity"],
  "without-multimedia": ["multimedia"],
  "without-expansion": ["expansion"],
  "without-debug-instrumentation": ["debug-instrumentation"],
  "minimal-board": ["connectivity", "multimedia", "expansion", "debug-instrumentation"],
}

export function Tmds62lEvm(props: { variant?: Tmds62lEvmVariant }) {
  return (
    <GeneratedTmds62lEvm
      removedFeatureIds={removedFeatureIdsByVariant[props.variant ?? "full-board"]}
    />
  )
}

export default () => <Tmds62lEvm />
