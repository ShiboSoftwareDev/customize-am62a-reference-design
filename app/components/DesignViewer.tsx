import type { AnyCircuitElement } from "circuit-json"
import { lazy, Suspense, useEffect, useMemo, useState } from "react"
import { getPcbRenderer } from "app/get-pcb-renderer"
import { useElementHeight } from "app/hooks/use-element-height"

async function loadPcbViewer() {
  const module = await import("@tscircuit/pcb-viewer")
  return { default: module.PCBViewer }
}

async function loadSchematicViewer() {
  const module = await import("@tscircuit/schematic-viewer")
  return { default: module.SchematicViewer }
}

async function loadCadViewer() {
  const module = await import("@tscircuit/3d-viewer")
  return { default: module.CadViewer }
}

const PCBViewer = lazy(loadPcbViewer)
const SchematicViewer = lazy(loadSchematicViewer)
const CadViewer = lazy(loadCadViewer)

type DesignViewerProps = {
  activeView: DesignView
  boardKey: string
  pcbCircuitJson: AnyCircuitElement[] | null
  schematicCircuitJsons: AnyCircuitElement[][]
  schematicSheetLabels: string[]
  isLoading: boolean
  onActiveViewChange: (activeView: DesignView) => void
}

export type DesignView = "pcb" | "schematic" | "cad"

export function DesignViewer({
  activeView,
  boardKey,
  pcbCircuitJson,
  schematicCircuitJsons,
  schematicSheetLabels,
  isLoading,
  onActiveViewChange,
}: DesignViewerProps) {
  const [schematicSheetIndex, setSchematicSheetIndex] = useState(0)
  const [renderedPcbCircuitJson, setRenderedPcbCircuitJson] = useState<AnyCircuitElement[] | null>(
    null,
  )
  const { elementRef, height } = useElementHeight<HTMLDivElement>()
  const schematicCircuitJson = schematicCircuitJsons[schematicSheetIndex]
  const pcbRenderer = useMemo(
    () => (pcbCircuitJson ? getPcbRenderer(pcbCircuitJson) : "webgpu"),
    [pcbCircuitJson],
  )
  const isPcbRendering =
    activeView === "pcb" && pcbCircuitJson !== null && renderedPcbCircuitJson !== pcbCircuitJson
  const isViewerLoading = isLoading || isPcbRendering

  useEffect(() => {
    void loadPcbViewer()
  }, [])

  useEffect(() => {
    setSchematicSheetIndex(0)
  }, [boardKey])

  useEffect(() => {
    if (schematicSheetIndex >= schematicSheetLabels.length) setSchematicSheetIndex(0)
  }, [schematicSheetIndex, schematicSheetLabels.length])

  return (
    <section className="design-viewer" aria-label="Design viewer" aria-busy={isViewerLoading}>
      <header className="viewer-toolbar">
        <div className="view-tabs" role="tablist" aria-label="Design view">
          <button
            type="button"
            role="tab"
            aria-selected={activeView === "pcb"}
            onClick={() => onActiveViewChange("pcb")}
          >
            <span className="tab-dot pcb-dot" /> PCB
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeView === "schematic"}
            onPointerEnter={() => void loadSchematicViewer()}
            onFocus={() => void loadSchematicViewer()}
            onClick={() => onActiveViewChange("schematic")}
          >
            <span className="tab-dot schematic-dot" /> Schematic
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeView === "cad"}
            onPointerEnter={() => void loadCadViewer()}
            onFocus={() => void loadCadViewer()}
            onClick={() => onActiveViewChange("cad")}
          >
            <span className="tab-dot three-dimensional-dot" /> 3D
          </button>
        </div>
        {activeView === "pcb" && pcbCircuitJson && (
          <p className="hover-hint">
            <span /> Hover a pad or trace to focus its net
          </p>
        )}
        {activeView === "schematic" && schematicCircuitJsons.length > 1 && (
          <label className="schematic-sheet-selector">
            Sheet
            <select
              aria-label="Schematic sheet"
              value={schematicSheetIndex}
              onChange={(event) => setSchematicSheetIndex(Number(event.target.value))}
            >
              {schematicSheetLabels.map((label, index) => (
                <option key={label} value={index}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        )}
      </header>

      <div className="viewer-canvas" ref={elementRef}>
        {activeView === "pcb" && pcbCircuitJson ? (
          <Suspense fallback={<ViewerLoading label="Loading PCB viewer…" />}>
            <PCBViewer
              key={boardKey}
              circuitJson={pcbCircuitJson}
              height={height}
              renderer={pcbRenderer}
              allowEditing={false}
              focusOnHover
              onRenderComplete={() => setRenderedPcbCircuitJson(pcbCircuitJson)}
            />
          </Suspense>
        ) : activeView === "schematic" && schematicCircuitJson ? (
          <Suspense fallback={<ViewerLoading label="Loading schematic viewer…" />}>
            <SchematicViewer
              key={`${boardKey}:${schematicSheetIndex}`}
              circuitJson={schematicCircuitJson}
              containerStyle={{ height: "100%" }}
            />
          </Suspense>
        ) : activeView === "cad" && pcbCircuitJson ? (
          <Suspense fallback={<ViewerLoading label="Loading 3D viewer…" />}>
            <CadViewer circuitJson={pcbCircuitJson} />
          </Suspense>
        ) : (
          <ViewerLoading label="Loading the reference design…" />
        )}
        {isViewerLoading && (pcbCircuitJson || schematicCircuitJsons.length > 0) && (
          <div className="rendering-badge">
            <span /> Loading design
          </div>
        )}
      </div>
    </section>
  )
}

function ViewerLoading({ label }: { label: string }) {
  return (
    <div className="viewer-empty">
      <div className="board-skeleton" aria-hidden="true">
        {Array.from({ length: 48 }, (_, index) => (
          <span key={index} />
        ))}
      </div>
      <p>{label}</p>
    </div>
  )
}
