import type { AnyCircuitElement } from "circuit-json"
import { useMemo, useState } from "react"
import { ConfigurationPanel } from "app/components/ConfigurationPanel"
import { DesignViewer } from "app/components/DesignViewer"
import { useEvmRender } from "app/hooks/use-evm-render"
import { getTiEvm, getTiEvmVariant, tiEvms, type TiEvmId } from "lib/ti-evm-catalog"

export function App() {
  const [evmId, setEvmId] = useState<TiEvmId>(tiEvms[0].id)
  const [variantId, setVariantId] = useState(tiEvms[0].variants[0].id)
  const [schematicPageId, setSchematicPageId] = useState("")
  const [retryIndex, setRetryIndex] = useState(0)
  const evm = getTiEvm(evmId)
  const variant = getTiEvmVariant(evm, variantId)
  const selectedSchematicPageId = schematicPageId || variant.schematicPages?.[0]?.id || ""
  const render = useEvmRender({
    variant,
    schematicPageId: selectedSchematicPageId,
    retryIndex,
  })
  const statusText = useMemo(() => {
    const seconds = (render.elapsedMs / 1000).toFixed(1)
    if (render.isLoading) return `Loading prebuilt design… ${seconds}s elapsed`
    if (!render.pcbCircuitJson) return "No design available"
    return `Loaded in ${seconds}s`
  }, [render.elapsedMs, render.isLoading, render.pcbCircuitJson])

  const selectEvm = (nextEvmId: TiEvmId) => {
    const nextEvm = getTiEvm(nextEvmId)
    setEvmId(nextEvmId)
    setVariantId(nextEvm.variants[0].id)
    setSchematicPageId(nextEvm.variants[0].schematicPages?.[0]?.id ?? "")
  }

  const selectVariant = (nextVariantId: string) => {
    const nextVariant = getTiEvmVariant(evm, nextVariantId)
    setVariantId(nextVariantId)
    setSchematicPageId(nextVariant.schematicPages?.[0]?.id ?? "")
  }

  const exportCircuitJson = () => {
    if (!render.pcbCircuitJson) return
    downloadCircuitJson(render.pcbCircuitJson, `${evm.id}-${variant.id}.circuit.json`)
  }

  return (
    <main className="app-shell">
      <ConfigurationPanel
        evm={evm}
        variant={variant}
        schematicPageId={selectedSchematicPageId}
        statusText={statusText}
        error={render.error}
        onEvmChange={selectEvm}
        onVariantChange={selectVariant}
        onSchematicPageChange={setSchematicPageId}
        onRetry={() => setRetryIndex((index) => index + 1)}
        onExportCircuitJson={exportCircuitJson}
        canExportCircuitJson={Boolean(render.pcbCircuitJson) && !render.isLoading}
      />
      <DesignViewer
        pcbKey={`${evm.id}:${variant.id}`}
        schematicKey={`${evm.id}:${variant.id}:${selectedSchematicPageId}`}
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
