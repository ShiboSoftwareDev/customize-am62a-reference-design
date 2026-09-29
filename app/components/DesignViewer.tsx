import { PCBViewer } from "@tscircuit/pcb-viewer"
import { SchematicViewer } from "@tscircuit/schematic-viewer"
import type { AnyCircuitElement } from "circuit-json"
import { useState } from "react"
import { useElementHeight } from "app/hooks/use-element-height"

type DesignViewerProps = {
  pcbKey: string
  schematicKey: string
  pcbCircuitJson: AnyCircuitElement[] | null
  schematicCircuitJson: AnyCircuitElement[] | null
  isLoading: boolean
}

export function DesignViewer({
  pcbKey,
  schematicKey,
  pcbCircuitJson,
  schematicCircuitJson,
  isLoading,
}: DesignViewerProps) {
  const [activeView, setActiveView] = useState<"pcb" | "schematic">("pcb")
  const { elementRef, height } = useElementHeight<HTMLDivElement>()

  return (
    <section className="design-viewer" aria-label="Design viewer" aria-busy={isLoading}>
      <header className="viewer-toolbar">
        <div className="view-tabs" role="tablist" aria-label="Design view">
          <button
            type="button"
            role="tab"
            aria-selected={activeView === "pcb"}
            onClick={() => setActiveView("pcb")}
          >
            <span className="tab-dot pcb-dot" /> PCB
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeView === "schematic"}
            disabled={!schematicCircuitJson}
            onClick={() => setActiveView("schematic")}
          >
            <span className="tab-dot schematic-dot" /> Schematic
          </button>
        </div>
        {activeView === "pcb" && pcbCircuitJson && (
          <p className="hover-hint">
            <span /> Hover a pad or trace to focus its net
          </p>
        )}
      </header>

      <div className="viewer-canvas" ref={elementRef}>
        {activeView === "pcb" && pcbCircuitJson ? (
          <PCBViewer
            key={pcbKey}
            circuitJson={pcbCircuitJson}
            height={height}
            renderer="canvas"
            allowEditing={false}
            focusOnHover
          />
        ) : activeView === "schematic" && schematicCircuitJson ? (
          <SchematicViewer
            key={schematicKey}
            circuitJson={schematicCircuitJson}
            containerStyle={{ height: "100%" }}
          />
        ) : (
          <div className="viewer-empty">
            <div className="board-skeleton" aria-hidden="true">
              {Array.from({ length: 48 }, (_, index) => (
                <span key={index} />
              ))}
            </div>
            <p>Loading the reference design…</p>
          </div>
        )}
        {isLoading && (pcbCircuitJson || schematicCircuitJson) && (
          <div className="rendering-badge">
            <span /> Loading design
          </div>
        )}
      </div>
    </section>
  )
}
