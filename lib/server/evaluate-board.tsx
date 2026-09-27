import { Circuit } from "@tscircuit/core"
import type { AnyCircuitElement } from "circuit-json"
import type { BoardRenderRequest, BoardRenderResponse } from "../api-types"
import { deriveModuleFlags, getSelectionCacheKey } from "../module-config"
import { AM62ABoard } from "../generated/am62a-board.runtime.js"

const maximumServerCacheEntries = 8
const renderCache = new Map<string, Promise<BoardRenderResponse>>()

type EvaluateBoardOptions = {
  runDrcChecks?: boolean
}

export async function evaluateBoard(
  request: BoardRenderRequest,
  options: EvaluateBoardOptions = {},
): Promise<BoardRenderResponse> {
  const runDrcChecks = options.runDrcChecks ?? false
  const cacheKey = `${getSelectionCacheKey(request)}:${runDrcChecks ? "drc" : "interactive"}`
  const cachedRender = renderCache.get(cacheKey)
  if (cachedRender) {
    const response = await cachedRender
    return { ...response, cacheStatus: "hit" }
  }

  const renderPromise = renderBoard(request, { runDrcChecks })
  renderCache.set(cacheKey, renderPromise)
  while (renderCache.size > maximumServerCacheEntries) {
    const oldestCacheKey = renderCache.keys().next().value
    if (typeof oldestCacheKey === "string") renderCache.delete(oldestCacheKey)
  }

  try {
    return await renderPromise
  } catch (error) {
    renderCache.delete(cacheKey)
    throw error
  }
}

async function renderBoard(
  request: BoardRenderRequest,
  options: Required<EvaluateBoardOptions>,
): Promise<BoardRenderResponse> {
  const startedAt = performance.now()
  const flags = deriveModuleFlags(request.selection)
  flags.addPours = request.addPours
  flags.renderSchematic = true

  const circuit = new Circuit({
    platform: { drcChecksDisabled: !options.runDrcChecks },
  })
  circuit._featureMspSchematicTraceRouting = false
  circuit.add(<AM62ABoard flags={flags} />)
  await circuit.renderUntilSettled()

  return {
    circuitJson: circuit.getCircuitJson() as AnyCircuitElement[],
    renderDurationMs: performance.now() - startedAt,
    cacheStatus: "miss",
  }
}
