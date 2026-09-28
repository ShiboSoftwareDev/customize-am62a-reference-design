import { boardPresets, findMatchingBoardPreset } from "lib/board-presets"
import {
  optionalModuleGroups,
  type OptionalModuleGroupId,
  type OptionalModuleSelection,
} from "lib/module-config"
import { useState } from "react"

type ConfigurationPanelProps = {
  selection: OptionalModuleSelection
  addPours: boolean
  statusText: string
  error: string
  onSelectionChange: (selection: OptionalModuleSelection) => void
  onAddPoursChange: (addPours: boolean) => void
  onRetry: () => void
  onExportCircuitJson: () => void
  onExploreBoosterPacks: () => void
  canExportCircuitJson: boolean
}

export function ConfigurationPanel(props: ConfigurationPanelProps) {
  const [isExportingTsx, setIsExportingTsx] = useState(false)
  const [sourceExportError, setSourceExportError] = useState("")
  const matchingPreset = findMatchingBoardPreset(props.selection)

  const setModuleEnabled = (moduleGroupId: OptionalModuleGroupId, enabled: boolean) => {
    props.onSelectionChange({ ...props.selection, [moduleGroupId]: enabled })
  }

  const exportTsx = async () => {
    setIsExportingTsx(true)
    setSourceExportError("")
    try {
      const response = await fetch("/api/source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selection: props.selection, addPours: props.addPours }),
      })
      if (!response.ok) throw new Error(await response.text())
      downloadTextFile({
        fileName: "AM62A-selected.tsx",
        text: await response.text(),
        mimeType: "text/plain",
      })
    } catch (error) {
      setSourceExportError(error instanceof Error ? error.message : String(error))
    } finally {
      setIsExportingTsx(false)
    }
  }

  return (
    <aside className="configuration-panel">
      <header className="board-title">
        <span className="eyebrow">TI reference design</span>
        <h1>SK-AM62A-LP</h1>
        <p>
          Choose the interfaces your product needs. Required power, memory, clock, reset, and boot
          circuitry stays included.
        </p>
      </header>

      <label className="preset-picker">
        <span>Prebuilt configuration</span>
        <select
          value={matchingPreset?.id ?? "custom"}
          onChange={(event) => {
            const preset = boardPresets.find(({ id }) => id === event.target.value)
            if (preset) props.onSelectionChange({ ...preset.selection })
          }}
        >
          {!matchingPreset && <option value="custom">Custom</option>}
          {boardPresets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
        </select>
        <small>{matchingPreset?.description ?? "Custom module mix"}</small>
      </label>

      <button className="boosterpack-launch" type="button" onClick={props.onExploreBoosterPacks}>
        Explore BoosterPacks
        <span aria-hidden="true">↗</span>
      </button>

      <fieldset className="module-list">
        <legend>Modules</legend>
        {["U18 processor", "USB-C power", "LPDDR4 memory"].map((label) => (
          <label className="module-row required" key={label}>
            <input type="checkbox" checked disabled />
            <span>{label}</span>
            <small>Required</small>
          </label>
        ))}
        {optionalModuleGroups.map(({ id, label }) => (
          <label className="module-row" key={id}>
            <input
              type="checkbox"
              checked={props.selection[id]}
              onChange={(event) => setModuleEnabled(id, event.target.checked)}
            />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>

      <label className="module-row pour-row">
        <input
          type="checkbox"
          checked={props.addPours}
          onChange={(event) => props.onAddPoursChange(event.target.checked)}
        />
        <span>Add copper pours</span>
      </label>

      <div className="export-buttons">
        <button type="button" disabled={isExportingTsx} onClick={() => void exportTsx()}>
          {isExportingTsx ? "Preparing TSX…" : "Export TSX"}
        </button>
        <button
          type="button"
          disabled={!props.canExportCircuitJson}
          onClick={props.onExportCircuitJson}
        >
          Export JSON
        </button>
      </div>

      <p className="render-status" role="status">
        {props.statusText}
      </p>
      {props.error && (
        <div className="render-error" role="alert">
          <p>{props.error}</p>
          <button type="button" onClick={props.onRetry}>
            Retry render
          </button>
        </div>
      )}
      {sourceExportError && (
        <div className="render-error" role="alert">
          <p>{sourceExportError}</p>
        </div>
      )}
    </aside>
  )
}

function downloadTextFile(params: { fileName: string; text: string; mimeType: string }) {
  const url = URL.createObjectURL(new Blob([params.text], { type: params.mimeType }))
  const link = document.createElement("a")
  link.href = url
  link.download = params.fileName
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
