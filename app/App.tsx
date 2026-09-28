import type { AnyCircuitElement } from "circuit-json"
import { useMemo, useState } from "react"
import { ConfigurationPanel } from "app/components/ConfigurationPanel"
import { DesignViewer } from "app/components/DesignViewer"
import { useBoardRender } from "app/hooks/use-board-render"
import {
  boosterPackBoards,
  getBoosterPackBoard,
  getBoosterPackConfiguration,
  getConfigurationForRemovedFeatures,
  type BoosterPackConfigurationId,
  type BoosterPackId,
} from "lib/boosterpack-configurations"

export function App() {
  const [boardId, setBoardId] = useState<BoosterPackId>(boosterPackBoards[0].id)
  const [configurationId, setConfigurationId] = useState<BoosterPackConfigurationId>(
    boosterPackBoards[0].configurations[0].id,
  )
  const [retryIndex, setRetryIndex] = useState(0)
  const board = getBoosterPackBoard(boardId)
  const configuration = getBoosterPackConfiguration(configurationId)
  const render = useBoardRender({ configuration, retryIndex })
  const statusText = useMemo(() => {
    const seconds = (render.elapsedMs / 1000).toFixed(1)
    if (render.isRendering) return `Loading prebuilt board… ${seconds}s elapsed`
    if (!render.circuitJson) return "No board available"
    return `Loaded prebuilt board in ${seconds}s`
  }, [render.circuitJson, render.elapsedMs, render.isRendering])

  const selectBoard = (nextBoardId: BoosterPackId) => {
    const nextBoard = getBoosterPackBoard(nextBoardId)
    setBoardId(nextBoardId)
    setConfigurationId(nextBoard.configurations[0].id)
  }

  const setFeatureRemoved = (featureId: string, removed: boolean) => {
    const removedFeatureIds = new Set(configuration.removedFeatureIds)
    if (removed) removedFeatureIds.add(featureId)
    else removedFeatureIds.delete(featureId)
    const nextConfiguration = getConfigurationForRemovedFeatures({
      board,
      removedFeatureIds: [...removedFeatureIds],
    })
    setConfigurationId(nextConfiguration.id)
  }

  const exportCircuitJson = () => {
    if (!render.circuitJson) return
    downloadCircuitJson(render.circuitJson)
  }

  return (
    <main className="app-shell">
      <ConfigurationPanel
        board={board}
        configuration={configuration}
        statusText={statusText}
        error={render.error}
        onBoardChange={selectBoard}
        onFeatureRemovalChange={setFeatureRemoved}
        onRetry={() => setRetryIndex((index) => index + 1)}
        onExportCircuitJson={exportCircuitJson}
        canExportCircuitJson={Boolean(render.circuitJson) && !render.isRendering}
      />
      <DesignViewer circuitJson={render.circuitJson} isRendering={render.isRendering} />
    </main>
  )
}

function downloadCircuitJson(circuitJson: AnyCircuitElement[]) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(circuitJson, null, 2)], { type: "application/json" }),
  )
  const link = document.createElement("a")
  link.href = url
  link.download = "boosterpack-configuration.circuit.json"
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
