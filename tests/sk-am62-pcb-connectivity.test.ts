import { expect, test } from "bun:test"
import { resolve } from "node:path"
import { checkSourceTracesHavePcbTraces } from "@tscircuit/checks"
import { parsePrebuiltCircuitJson } from "app/parse-prebuilt-circuit-json"

test("SK-AM62 multi-pin nets preserve physical PCB routing", async () => {
  const sourcePath = resolve(
    import.meta.dir,
    "../lib/generated/ti-evms/sk-am62.source.circuit.json.gz",
  )
  const circuitJson = parsePrebuiltCircuitJson(
    new Uint8Array(await Bun.file(sourcePath).arrayBuffer()),
  )
  const sourceTraceById = new Map(
    circuitJson.flatMap((element) =>
      element.type === "source_trace" ? [[element.source_trace_id, element] as const] : [],
    ),
  )
  const connectivityErrors = checkSourceTracesHavePcbTraces(circuitJson).filter(
    ({ source_trace_id }) => {
      const sourceTrace = sourceTraceById.get(source_trace_id)
      return (
        sourceTrace !== undefined &&
        "connected_source_port_ids" in sourceTrace &&
        Array.isArray(sourceTrace.connected_source_port_ids) &&
        sourceTrace.connected_source_port_ids.length > 1
      )
    },
  )

  expect(connectivityErrors.map(({ message }) => message)).toEqual([])
})
