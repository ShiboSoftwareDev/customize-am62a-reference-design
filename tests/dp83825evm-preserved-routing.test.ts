import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { expect, setDefaultTimeout, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { gunzipSync, strFromU8 } from "fflate"
import { evaluateParameterizedTiEvm } from "../lib/server/evaluate-board"

type PcbTraceElement = {
  route: PcbTraceRoutePoint[]
  source_trace_id?: string
  type: "pcb_trace"
}

type PcbTraceRoutePoint = {
  layer?: string
  route_type: string
  width?: number
  x?: number
  y?: number
}

setDefaultTimeout(15_000)

test("DP83825EVM preserves the imported TI PCB routing", async () => {
  const sourceCircuitJson: AnyCircuitElement[] = JSON.parse(
    strFromU8(
      gunzipSync(
        readFileSync(
          resolve(import.meta.dir, "../lib/generated/ti-evms/dp83825evm.source.circuit.json.gz"),
        ),
      ),
    ),
  )
  const rendered = await evaluateParameterizedTiEvm({
    evmId: "dp83825evm",
    options: { removedFeatureIds: [] },
  })
  const sourcePcbTraces = sourceCircuitJson.flatMap((element) =>
    isPcbTraceElement(element) ? [element] : [],
  )
  const generatedPcbTraces = getGeneratedPcbTraces(
    readFileSync(
      resolve(import.meta.dir, "../lib/generated/ti-evms/dp83825evm.circuit.tsx"),
      "utf8",
    ),
  )
  const renderedPcbTraces = rendered.circuitJson.flatMap((element) =>
    isPcbTraceElement(element) ? [element] : [],
  )

  expect(generatedPcbTraces).toHaveLength(sourcePcbTraces.length)
  expect(getRouteSignatureCounts(generatedPcbTraces)).toEqual(
    getRouteSignatureCounts(sourcePcbTraces),
  )
  expect(renderedPcbTraces).toHaveLength(sourcePcbTraces.length)
  expect(getWireWidths(renderedPcbTraces).size).toBeGreaterThan(3)
  expect(
    renderedPcbTraces.every(({ source_trace_id }) => source_trace_id?.startsWith("source_net_")),
  ).toBeTrue()
  expect(rendered.circuitJson.filter(({ type }) => type === "pcb_via")).toHaveLength(
    sourceCircuitJson.filter(({ type }) => type === "pcb_via").length,
  )
})

function getGeneratedPcbTraces(generatedSource: string): PcbTraceElement[] {
  return [...generatedSource.matchAll(/<pcbtrace[^>]* route=\{(\[[^\n]*\])\} \/>/gu)].flatMap(
    (match) => {
      const routeSource = match[1]
      return routeSource
        ? [{ route: JSON.parse(routeSource) as PcbTraceRoutePoint[], type: "pcb_trace" }]
        : []
    },
  )
}

function getRouteSignatureCounts(pcbTraces: PcbTraceElement[]): Map<string, number> {
  const routeSignatureCounts = new Map<string, number>()
  for (const pcbTrace of pcbTraces) {
    const routeSignature = JSON.stringify(pcbTrace.route, (_propertyName, propertyValue) =>
      typeof propertyValue === "number" ? Math.round(propertyValue * 1e6) / 1e6 : propertyValue,
    )
    routeSignatureCounts.set(routeSignature, (routeSignatureCounts.get(routeSignature) ?? 0) + 1)
  }
  return routeSignatureCounts
}

function getWireWidths(pcbTraces: PcbTraceElement[]): Set<number> {
  return new Set(
    pcbTraces.flatMap(({ route }) =>
      route.flatMap((routePoint) =>
        routePoint.route_type === "wire" && routePoint.width !== undefined
          ? [routePoint.width]
          : [],
      ),
    ),
  )
}

function isPcbTraceElement(element: unknown): element is PcbTraceElement {
  return (
    typeof element === "object" &&
    element !== null &&
    "type" in element &&
    element.type === "pcb_trace" &&
    "route" in element &&
    Array.isArray(element.route)
  )
}
