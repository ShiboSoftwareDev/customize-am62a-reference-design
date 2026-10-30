import { expect } from "bun:test"
import "bun-match-svg"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"

type CircuitPcbBoard = AnyCircuitElement & {
  type: "pcb_board"
  center: { x: number; y: number }
  width?: number
  height?: number
}

export async function expectMinimalBoardCopperSnapshots({
  circuitJson,
  testPath,
}: {
  circuitJson: AnyCircuitElement[]
  testPath: string
}): Promise<void> {
  const board = circuitJson.find(
    (element): element is CircuitPcbBoard => element.type === "pcb_board",
  )
  if (!board || board.width === undefined || board.height === undefined)
    throw new Error("No board bounds for copper snapshot")
  for (const layer of ["top", "bottom"] as const) {
    const layerCircuitJson = circuitJson.filter(
      (element) => element.type !== "pcb_copper_pour" || element.layer === layer,
    )
    const svg = convertCircuitJsonToPcbSvg(layerCircuitJson, {
      includeVersion: false,
      showErrorsInTextOverlay: false,
      showSolderMask: false,
      hiddenLayerOpacity: 0,
      layer,
      viewport: {
        minX: board.center.x - board.width / 2 - 1,
        maxX: board.center.x + board.width / 2 + 1,
        minY: board.center.y - board.height / 2 - 1,
        maxY: board.center.y + board.height / 2 + 1,
      },
    })
    await expect(svg).toMatchSvgSnapshot(testPath, `minimal-${layer}`)
  }
}
