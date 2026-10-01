import type { AnyCircuitElement } from "circuit-json"
import { useMemo, useState } from "react"
import { ConfigurationPanel } from "app/components/ConfigurationPanel"
import { DesignViewer } from "app/components/DesignViewer"
import { BoardDetailPage } from "app/components/BoardDetailPage"
import { useEvmRender } from "app/hooks/use-evm-render"
import {
  getTiEvm,
  getTiEvmVariant,
  getTiEvmVariantForRemovedFeatures,
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
  const variant = getTiEvmVariant(evm, variantId)
  const render = useEvmRender({ variant, retryIndex })
  const statusText = useMemo(() => {
    const seconds = (render.elapsedMs / 1000).toFixed(1)
    if (render.isLoading) return `Loading prebuilt design… ${seconds}s elapsed`
    if (!render.pcbCircuitJson) return "No design available"
    return `Loaded in ${seconds}s`
  }, [render.elapsedMs, render.isLoading, render.pcbCircuitJson])

  const exportCircuitJson = () => {
    if (!render.pcbCircuitJson) return
    downloadCircuitJson(render.pcbCircuitJson, `${evm.id}-${variant.id}.circuit.json`)
  }

  const changeEvm = (nextEvmId: TiEvmId) => {
    const nextEvm = getTiEvm(nextEvmId)
    setEvmId(nextEvmId)
    setVariantId(nextEvm.variants[0].id)
  }

  const setFeatureRemoved = (featureId: string, removed: boolean) => {
    const removedFeatureIds = new Set(variant.removedFeatureIds)
    if (removed) removedFeatureIds.add(featureId)
    else removedFeatureIds.delete(featureId)
    setVariantId(getTiEvmVariantForRemovedFeatures(evm, [...removedFeatureIds]).id)
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
        onFeatureRemovalChange={setFeatureRemoved}
        onSelectFullBoard={() => setVariantId(evm.variants[0].id)}
        onSelectMinimalBoard={() => setVariantId(evm.variants[evm.variants.length - 1].id)}
        onRetry={() => setRetryIndex((index) => index + 1)}
        onExportCircuitJson={exportCircuitJson}
        canExportCircuitJson={Boolean(render.pcbCircuitJson) && !render.isLoading}
      />
      <DesignViewer
        pcbKey={`${evm.id}:${variant.id}`}
        schematicKey={`${evm.id}:${variant.id}`}
        pcbCircuitJson={render.pcbCircuitJson}
        schematicCircuitJson={render.schematicCircuitJson}
        isLoading={render.isLoading}
      />
    </main>
  )
}

function downloadCircuitJson(circuitJson: AnyCircuitElement[], fileName: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(circuitJson, null, 2)], { type: "application/json" }),
  )
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
