import { expect, setDefaultTimeout, test } from "bun:test"
import "bun-match-svg"
import { checkEachPcbPortConnectedToPcbTraces } from "@tscircuit/checks"
import type { AnyCircuitElement } from "circuit-json"
import { evaluateParameterizedTiEvm } from "../lib/server/evaluate-board"
import { getFocusedPcbSvg } from "./fixtures/get-focused-pcb-svg"

type Point = { x: number; y: number }
type SourceNetId = string

const removedJ4PadCenter = { x: 28.4988, y: 53.1876 }

setDefaultTimeout(20_000)

test("LM5155 retains PGOOD connectivity when the control header is removed", async () => {
  const fullBoard = await evaluateParameterizedTiEvm({
    evmId: "lm5155evm-fly",
    options: { removedFeatureIds: [] },
  })
  const boardWithoutControlHeader = await evaluateParameterizedTiEvm({
    evmId: "lm5155evm-fly",
    options: { removedFeatureIds: ["control-loop-access"] },
  })
  const pgoodSourceNetId = getSourceNetIdByName({
    circuitJson: boardWithoutControlHeader.circuitJson,
    netName: "PGOOD",
  })

  expect(hasPcbViaAt(fullBoard.circuitJson, removedJ4PadCenter)).toBeFalse()
  expect(hasPcbViaAt(boardWithoutControlHeader.circuitJson, removedJ4PadCenter)).toBeTrue()
  expect(
    getPcbTraceCount({
      circuitJson: boardWithoutControlHeader.circuitJson,
      sourceNetId: pgoodSourceNetId,
    }),
  ).toBe(
    getPcbTraceCount({
      circuitJson: fullBoard.circuitJson,
      sourceNetId: getSourceNetIdByName({
        circuitJson: fullBoard.circuitJson,
        netName: "PGOOD",
      }),
    }),
  )
  expect(
    checkEachPcbPortConnectedToPcbTraces(boardWithoutControlHeader.circuitJson).filter(
      (error) => "message" in error && error.message.includes("PGOOD"),
    ),
  ).toEqual([])

  await expect(
    getFocusedPcbSvg({ circuitJson: fullBoard.circuitJson, ...focusBounds }),
  ).toMatchSvgSnapshot(import.meta.path, "full")
  await expect(
    getFocusedPcbSvg({ circuitJson: boardWithoutControlHeader.circuitJson, ...focusBounds }),
  ).toMatchSvgSnapshot(import.meta.path, "without-control-header")
})

const focusBounds = { maximumX: 43, maximumY: 55, minimumX: 27, minimumY: 45 }

function getSourceNetIdByName(params: {
  circuitJson: AnyCircuitElement[]
  netName: string
}): SourceNetId {
  const sourceNet = params.circuitJson.find(
    (element) => element.type === "source_net" && element.name === params.netName,
  )
  if (!sourceNet || typeof sourceNet.source_net_id !== "string") {
    throw new Error(`Missing source net ${params.netName}`)
  }
  return sourceNet.source_net_id
}

function getPcbTraceCount(params: {
  circuitJson: AnyCircuitElement[]
  sourceNetId: SourceNetId
}): number {
  return params.circuitJson.filter(
    (element) => element.type === "pcb_trace" && element.source_trace_id === params.sourceNetId,
  ).length
}

function hasPcbViaAt(circuitJson: AnyCircuitElement[], point: Point): boolean {
  return circuitJson.some(
    (element) =>
      element.type === "pcb_via" &&
      typeof element.x === "number" &&
      typeof element.y === "number" &&
      pointsAreEqual({ x: element.x, y: element.y }, point),
  )
}

function pointsAreEqual(firstPoint: Point, secondPoint: Point): boolean {
  return (
    Math.abs(firstPoint.x - secondPoint.x) < 1e-6 && Math.abs(firstPoint.y - secondPoint.y) < 1e-6
  )
}
