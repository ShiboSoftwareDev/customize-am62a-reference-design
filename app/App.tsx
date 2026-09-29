import type { AnyCircuitElement } from "circuit-json"
import { useMemo, useState } from "react"
import { ConfigurationPanel } from "app/components/ConfigurationPanel"
import { DesignViewer } from "app/components/DesignViewer"
import { useEvmRender } from "app/hooks/use-evm-render"
import { getTiEvmVariant, skAm62aLp } from "lib/ti-evm-catalog"

export function App() {
  const [variantId, setVariantId] = useState(skAm62aLp.variants[0].id)
  const [retryIndex, setRetryIndex] = useState(0)
  const variant = getTiEvmVariant(variantId)
  const render = useEvmRender({ variant, retryIndex })
  const statusText = useMemo(() => {
    const seconds = (render.elapsedMs / 1000).toFixed(1)
    if (render.isLoading) return `Loading prebuilt design… ${seconds}s elapsed`
    if (!render.pcbCircuitJson) return "No design available"
    return `Loaded in ${seconds}s`
  }, [render.elapsedMs, render.isLoading, render.pcbCircuitJson])

  const exportCircuitJson = () => {
    if (!render.pcbCircuitJson) return
    downloadCircuitJson(render.pcbCircuitJson, `${skAm62aLp.id}-${variant.id}.circuit.json`)
  }

  return (
    <main className="app-shell">
      <ConfigurationPanel
        evm={skAm62aLp}
        variant={variant}
        statusText={statusText}
        error={render.error}
        onVariantChange={setVariantId}
        onRetry={() => setRetryIndex((index) => index + 1)}
        onExportCircuitJson={exportCircuitJson}
        canExportCircuitJson={Boolean(render.pcbCircuitJson) && !render.isLoading}
      />
      <DesignViewer
        pcbKey={`${skAm62aLp.id}:${variant.id}`}
        schematicKey={`${skAm62aLp.id}:${variant.id}`}
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
