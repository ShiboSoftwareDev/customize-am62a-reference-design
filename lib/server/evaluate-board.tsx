import { Circuit } from "@tscircuit/core"
import type { AnyCircuitElement } from "circuit-json"
import type { BoardRenderResponse } from "../board-render-types"
import {
  ParameterizedTiEvm,
  type ParameterizedTiEvmId,
  type ParameterizedTiEvmOptions,
} from "../evms/parameterized-ti-evms"

export async function evaluateParameterizedTiEvm(request: {
  evmId: ParameterizedTiEvmId
  options: ParameterizedTiEvmOptions
  renderImportedCopperPours?: boolean
}): Promise<BoardRenderResponse> {
  const startedAt = performance.now()
  const circuit = new Circuit({ platform: { drcChecksDisabled: true } })
  circuit.add(
    <ParameterizedTiEvm
      evmId={request.evmId}
      options={request.options}
      renderImportedCopperPours={request.renderImportedCopperPours}
    />,
  )
  await circuit.renderUntilSettled()

  return {
    circuitJson: circuit.getCircuitJson() as AnyCircuitElement[],
    renderDurationMs: performance.now() - startedAt,
    cacheStatus: "miss",
  }
}
