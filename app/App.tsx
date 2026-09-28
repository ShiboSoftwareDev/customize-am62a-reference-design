import type { AnyCircuitElement } from "circuit-json"
import { useMemo, useState } from "react"
import { BoosterPackGallery } from "app/components/BoosterPackGallery"
import { ConfigurationPanel } from "app/components/ConfigurationPanel"
import { DesignViewer } from "app/components/DesignViewer"
import { useBoardRender } from "app/hooks/use-board-render"
import { allOptionalModules, type OptionalModuleSelection } from "lib/module-config"

export function App() {
  const [selection, setSelection] = useState<OptionalModuleSelection>({ ...allOptionalModules })
  const [addPours, setAddPours] = useState(false)
  const [isBoosterPackGalleryOpen, setIsBoosterPackGalleryOpen] = useState(false)
  const [retryIndex, setRetryIndex] = useState(0)
  const render = useBoardRender({ selection, addPours, retryIndex })
  const statusText = useMemo(() => {
    const seconds = (render.elapsedMs / 1000).toFixed(1)
    if (render.isRendering) return `Rendering… ${seconds}s elapsed`
    if (!render.circuitJson) return "No render available"
    return `${render.loadedFromCache ? "Loaded from cache" : "Rendered"} in ${seconds}s`
  }, [render.circuitJson, render.elapsedMs, render.isRendering, render.loadedFromCache])

  const exportCircuitJson = () => {
    if (!render.circuitJson) return
    downloadCircuitJson(render.circuitJson)
  }

  return (
    <main className="app-shell">
      <ConfigurationPanel
        selection={selection}
        addPours={addPours}
        statusText={statusText}
        error={render.error}
        onSelectionChange={setSelection}
        onAddPoursChange={setAddPours}
        onRetry={() => setRetryIndex((index) => index + 1)}
        onExportCircuitJson={exportCircuitJson}
        onExploreBoosterPacks={() => setIsBoosterPackGalleryOpen(true)}
        canExportCircuitJson={Boolean(render.circuitJson) && !render.isRendering}
      />
      <DesignViewer circuitJson={render.circuitJson} isRendering={render.isRendering} />
      {isBoosterPackGalleryOpen && (
        <BoosterPackGallery onClose={() => setIsBoosterPackGalleryOpen(false)} />
      )}
    </main>
  )
}

function downloadCircuitJson(circuitJson: AnyCircuitElement[]) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(circuitJson, null, 2)], { type: "application/json" }),
  )
  const link = document.createElement("a")
  link.href = url
  link.download = "AM62A-selected.circuit.json"
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
