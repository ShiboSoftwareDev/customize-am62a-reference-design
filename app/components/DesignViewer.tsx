import { PCBViewer } from "@tscircuit/pcb-viewer"
import { SchematicViewer } from "@tscircuit/schematic-viewer"
import type { AnyCircuitElement } from "circuit-json"
import { useState } from "react"
import { useElementHeight } from "app/hooks/use-element-height"

type DesignViewerProps = {
  circuitJson: AnyCircuitElement[] | null
  isRendering: boolean
}

export function DesignViewer({ circuitJson, isRendering }: DesignViewerProps) {
  const [activeView, setActiveView] = useState<"pcb" | "schematic">("pcb")
  const { elementRef, height } = useElementHeight<HTMLDivElement>()

  return (
    <section className="design-viewer" aria-label="Design viewer" aria-busy={isRendering}>
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
            disabled={!circuitJson}
            onClick={() => setActiveView("schematic")}
          >
            <span className="tab-dot schematic-dot" /> Schematic
          </button>
        </div>
        {activeView === "pcb" && circuitJson && (
          <p className="hover-hint">
            <span /> Hover a pad or trace to focus its net
          </p>
        )}
      </header>

      <div className="viewer-canvas" ref={elementRef}>
        {circuitJson ? (
          activeView === "pcb" ? (
            <PCBViewer
              circuitJson={circuitJson}
              height={height}
              renderer="webgpu"
              allowEditing={false}
              focusOnHover
            />
          ) : (
            <SchematicViewer circuitJson={circuitJson} containerStyle={{ height: "100%" }} />
          )
        ) : (
          <div className="viewer-empty">
            <div className="board-skeleton" aria-hidden="true">
              {Array.from({ length: 48 }, (_, index) => (
                <span key={index} />
              ))}
            </div>
            <p>Rendering the reference design…</p>
          </div>
        )}
        {isRendering && circuitJson && (
          <div className="rendering-badge">
            <span /> Updating configuration
          </div>
        )}
      </div>
    </section>
  )
}
