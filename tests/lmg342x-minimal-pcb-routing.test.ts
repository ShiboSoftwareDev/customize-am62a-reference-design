import { expect, setDefaultTimeout, test } from "bun:test"
import "bun-match-svg"
import { checkDanglingTraces } from "@tscircuit/checks"
import type { AnyCircuitElement } from "circuit-json"
import { evaluateParameterizedTiEvm } from "../lib/server/evaluate-board"
import { getFocusedPcbSvg } from "./fixtures/get-focused-pcb-svg"

type Point = { x: number; y: number }

type PcbTraceElement = AnyCircuitElement & {
  route: Point[]
  type: "pcb_trace"
}

const removedFeatureIds = [
  "logic-measurement-access",
  "power-measurement-access",
  "bias-measurement-access",
  "status-indicators",
]
const removedHsFetPwmPort = { x: 91.01777326, y: 110.92500548 }

setDefaultTimeout(30_000)

test("LMG342X minimal removes the imported HS_FET_PWM route branch", async () => {
  const fullBoard = await evaluateParameterizedTiEvm({
    evmId: "lmg342x-bb-evm",
    options: { removedFeatureIds: [] },
  })
  const minimalBoard = await evaluateParameterizedTiEvm({
    evmId: "lmg342x-bb-evm",
    options: { removedFeatureIds },
  })

  expect(hasTraceEndpointAt(fullBoard.circuitJson, removedHsFetPwmPort)).toBeTrue()
  expect(hasTraceEndpointAt(minimalBoard.circuitJson, removedHsFetPwmPort)).toBeFalse()
  expect(
    checkDanglingTraces(minimalBoard.circuitJson).some(({ center }) =>
      pointsAreEqual(center, removedHsFetPwmPort),
    ),
  ).toBeFalse()

  await expect(
    getFocusedPcbSvg({ circuitJson: fullBoard.circuitJson, ...focusBounds }),
  ).toMatchSvgSnapshot(import.meta.path, "full")
  await expect(
    getFocusedPcbSvg({ circuitJson: minimalBoard.circuitJson, ...focusBounds }),
  ).toMatchSvgSnapshot(import.meta.path, "minimal")
})

const focusBounds = { maximumX: 99, maximumY: 116, minimumX: 87, minimumY: 93 }

function hasTraceEndpointAt(circuitJson: AnyCircuitElement[], point: Point): boolean {
  return circuitJson.some(
    (element) =>
      isPcbTrace(element) &&
      [element.route[0], element.route.at(-1)].some(
        (routePoint) => routePoint !== undefined && pointsAreEqual(routePoint, point),
      ),
  )
}

function pointsAreEqual(firstPoint: Point, secondPoint: Point): boolean {
  return (
    Math.abs(firstPoint.x - secondPoint.x) < 1e-6 && Math.abs(firstPoint.y - secondPoint.y) < 1e-6
  )
}

function isPcbTrace(element: AnyCircuitElement): element is PcbTraceElement {
  return element.type === "pcb_trace" && Array.isArray(element.route)
}
