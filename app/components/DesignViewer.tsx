import type { AnyCircuitElement } from "circuit-json"
import { lazy, Suspense, useEffect, useMemo, useState } from "react"
import { preload } from "react-dom"
import { SchematicSourceNotice } from "app/components/SchematicSourceNotice"
import { getPcbRenderer } from "app/get-pcb-renderer"
import { getPcbViewerCircuitJson } from "app/get-pcb-viewer-circuit-json"
import { useElementHeight } from "app/hooks/use-element-height"
import { getSelectedSchematicSheet } from "app/components/get-selected-schematic-sheet"
import { preloadTiEvmPcbVariants } from "app/preload-ti-evm"
import { getTiEvm, type TiEvmId } from "lib/ti-evm-catalog"

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
  boardKey: TiEvmId
  referenceUrl: string
  unavailableSchematicSheetLabels?: string[]
  prebuiltCadSceneUrl: string
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
  referenceUrl,
  unavailableSchematicSheetLabels,
  prebuiltCadSceneUrl,
  pcbCircuitJson,
  schematicCircuitJsons,
  schematicSheetLabels,
  isLoading,
  onActiveViewChange,
}: DesignViewerProps) {
  const [requestedSchematicSheetLabel, setRequestedSchematicSheetLabel] = useState<
    string | undefined
  >()
  const pcbRenderRequest = useMemo(
    () => ({ pcbCircuitJson, boardKey, activeView }),
    [pcbCircuitJson, boardKey, activeView],
  )
  const [completedPcbRenderRequest, setCompletedPcbRenderRequest] = useState<
    typeof pcbRenderRequest | null
  >(null)
  const { elementRef, height } = useElementHeight<HTMLDivElement>()
  const schematicSheetSelection = getSelectedSchematicSheet({
    requestedLabel: requestedSchematicSheetLabel,
    labels: schematicSheetLabels,
  })
  const schematicCircuitJson = schematicCircuitJsons[schematicSheetSelection.index]
  const pcbRenderer = useMemo(
    () => (pcbCircuitJson ? getPcbRenderer(pcbCircuitJson) : "webgpu"),
    [pcbCircuitJson],
  )
  const pcbViewerCircuitJson = useMemo(
    () => (pcbCircuitJson ? getPcbViewerCircuitJson(pcbCircuitJson) : null),
    [pcbCircuitJson],
  )
  const isPcbRendering =
    activeView === "pcb" &&
    pcbCircuitJson !== null &&
    completedPcbRenderRequest !== pcbRenderRequest
  const isViewerLoading = isLoading || isPcbRendering

  useEffect(() => {
    void loadPcbViewer()
  }, [])

  useEffect(() => {
    if (pcbRenderRequest.activeView !== "pcb") {
      setCompletedPcbRenderRequest(null)
      return
    }
    if (completedPcbRenderRequest !== pcbRenderRequest) return
    const controller = new AbortController()
    void preloadTiEvmPcbVariants({
      evm: getTiEvm(pcbRenderRequest.boardKey),
      signal: controller.signal,
    }).catch(() => undefined)
    return () => controller.abort()
  }, [completedPcbRenderRequest, pcbRenderRequest])

  useEffect(() => {
    setRequestedSchematicSheetLabel(undefined)
  }, [boardKey])

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
            onClick={() => {
              preload(prebuiltCadSceneUrl, { as: "fetch", crossOrigin: "anonymous" })
              onActiveViewChange("cad")
            }}
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
              value={schematicSheetSelection.label}
              onChange={(event) => setRequestedSchematicSheetLabel(event.target.value)}
            >
              {schematicSheetLabels.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        )}
      </header>

      <div className="viewer-canvas" ref={elementRef}>
        {activeView === "schematic" &&
          schematicSheetSelection.label &&
          unavailableSchematicSheetLabels?.includes(schematicSheetSelection.label) && (
            <SchematicSourceNotice referenceUrl={referenceUrl} />
          )}

        {activeView === "pcb" && pcbCircuitJson ? (
          <Suspense fallback={<ViewerLoading label="Loading PCB viewer…" />}>
            <PCBViewer
              key={boardKey}
              circuitJson={pcbViewerCircuitJson ?? pcbCircuitJson}
              height={height}
              renderer={pcbRenderer}
              allowEditing={false}
              focusOnHover
              onRenderComplete={() => setCompletedPcbRenderRequest(pcbRenderRequest)}
            />
          </Suspense>
        ) : activeView === "schematic" && schematicCircuitJson ? (
          <Suspense fallback={<ViewerLoading label="Loading schematic viewer…" />}>
            <SchematicViewer
              key={`${boardKey}:${schematicSheetSelection.label}`}
              circuitJson={schematicCircuitJson}
              containerStyle={{ height: "100%" }}
            />
          </Suspense>
        ) : activeView === "cad" ? (
          <Suspense fallback={<ViewerLoading label="Loading 3D viewer…" />}>
            <CadViewer key={boardKey} glbUrl={prebuiltCadSceneUrl} />
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
