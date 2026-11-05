import { useMemo, useState } from "react"
import { ConfigurationPanel } from "app/components/ConfigurationPanel"
import { DesignViewer, type DesignView } from "app/components/DesignViewer"
import { BoardDetailPage } from "app/components/BoardDetailPage"
import { useEvmRender } from "app/hooks/use-evm-render"
import {
  getTiEvm,
  getTiEvmVariant,
  getTiEvmVariantSchematicSheetLabels,
  tiEvms,
  type TiEvmId,
} from "lib/ti-evm-catalog"

export function App() {
  const detailBoardId = new URLSearchParams(window.location.search).get("board")
  const detailBoard = tiEvms.find(({ id }) => id === detailBoardId)

  if (detailBoard) return <BoardDetailPage evm={detailBoard} />

  return <Configurator />
}

function Configurator() {
  const [evmId, setEvmId] = useState<TiEvmId>(tiEvms[0].id)
  const evm = getTiEvm(evmId)
  const [variantId, setVariantId] = useState(evm.variants[0].id)
  const [retryIndex, setRetryIndex] = useState(0)
  const [activeView, setActiveView] = useState<DesignView>("pcb")
  const variant = getTiEvmVariant(evm, variantId)
  const render = useEvmRender({
    evm,
    variant,
    loadPcb: activeView === "pcb",
    loadSchematics: activeView === "schematic",
    retryIndex,
  })
  const statusText = useMemo(() => {
    if (activeView !== "pcb") return ""
    const seconds = (render.elapsedMs / 1000).toFixed(1)
    if (render.isLoading) return `Loading prebuilt design… ${seconds}s elapsed`
    if (!render.pcbCircuitJson) return "No design available"
    return `Design data loaded in ${seconds}s`
  }, [activeView, render.elapsedMs, render.isLoading, render.pcbCircuitJson])

  const changeEvm = (nextEvmId: TiEvmId) => {
    const nextEvm = getTiEvm(nextEvmId)
    setEvmId(nextEvmId)
    setVariantId(nextEvm.variants[0].id)
  }

  return (
    <main className="app-shell">
      <ConfigurationPanel
        evms={tiEvms}
        evm={evm}
        variant={variant}
        statusText={statusText}
        error={render.error}
        onEvmChange={changeEvm}
        onVariantChange={setVariantId}
        onRetry={() => setRetryIndex((index) => index + 1)}
        canExportCircuitJson={activeView !== "pcb" || Boolean(render.pcbCircuitJson)}
      />
      <DesignViewer
        activeView={activeView}
        referenceUrl={evm.sourceUrl}
        unavailableSchematicSheetLabels={evm.unavailableSchematicSheetLabels}
        boardKey={evm.id}
        prebuiltCadSceneUrl={variant.prebuiltCadSceneUrl}
        pcbCircuitJson={render.pcbCircuitJson}
        schematicCircuitJsons={render.schematicCircuitJsons}
        schematicSheetLabels={getTiEvmVariantSchematicSheetLabels(
          evm,
          render.schematicVariant ?? variant,
        )}
        isLoading={render.isLoading}
        onActiveViewChange={setActiveView}
      />
    </main>
  )
}
