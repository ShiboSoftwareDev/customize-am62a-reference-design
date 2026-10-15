import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { expect, setDefaultTimeout, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { gunzipSync, strFromU8 } from "fflate"
import { evaluateParameterizedTiEvm } from "../lib/server/evaluate-board"

type PcbTraceElement = AnyCircuitElement & {
  route: PcbTraceRoutePoint[]
  type: "pcb_trace"
}

type PcbTraceRoutePoint = Record<string, unknown> & {
  route_type?: string
  width?: number
}

setDefaultTimeout(15_000)

test("DP83825EVM minimal variant preserves applicable TI PCB routes", async () => {
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
    options: {
      removedFeatureIds: [
        "usb-mdio-controller",
        "power-indicator",
        "phy-status-indicators",
        "clock-test-access",
      ],
    },
  })
  const sourcePcbTraces = sourceCircuitJson.filter(isPcbTraceElement)
  const renderedPcbTraces = rendered.circuitJson.filter(isPcbTraceElement)
  const sourceRouteSignatures = new Set(
    sourcePcbTraces.map(({ route }) => getRouteSignature(route)),
  )

  const preservedRouteCount = renderedPcbTraces.filter(({ route }) =>
    sourceRouteSignatures.has(getRouteSignature(route)),
  ).length

  expect(preservedRouteCount).toBeGreaterThan(sourcePcbTraces.length * 0.7)
  expect(getWireWidths(renderedPcbTraces).size).toBeGreaterThan(3)
  expect(rendered.circuitJson.some(({ type }) => type.endsWith("_error"))).toBeFalse()
})

function getRouteSignature(route: PcbTraceRoutePoint[]): string {
  return JSON.stringify(
    route.map((routePoint) =>
      Object.entries(routePoint)
        .sort(([firstPropertyName], [secondPropertyName]) =>
          firstPropertyName.localeCompare(secondPropertyName),
        )
        .map(([propertyName, propertyValue]) => [
          propertyName,
          typeof propertyValue === "number" ? Math.round(propertyValue * 1e6) / 1e6 : propertyValue,
        ]),
    ),
  )
}

function getWireWidths(pcbTraces: PcbTraceElement[]): Set<number> {
  return new Set(
    pcbTraces.flatMap(({ route }) =>
      route.flatMap((routePoint) =>
        routePoint.route_type === "wire" && typeof routePoint.width === "number"
          ? [routePoint.width]
          : [],
      ),
    ),
  )
}

function isPcbTraceElement(element: AnyCircuitElement): element is PcbTraceElement {
  return element.type === "pcb_trace" && "route" in element && Array.isArray(element.route)
}
