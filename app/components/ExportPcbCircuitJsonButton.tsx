import type { AnyCircuitElement } from "circuit-json"
import { useState } from "react"
import {
  loadPrebuiltCircuitJson,
  type PrebuiltCircuitJsonUrl,
} from "app/load-prebuilt-circuit-json"

export function ExportPcbCircuitJsonButton({
  circuitJsonUrl,
  fileName,
  disabled,
}: {
  circuitJsonUrl: PrebuiltCircuitJsonUrl
  fileName: string
  disabled: boolean
}) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState("")

  return (
    <>
      <button
        className="export-json-button"
        type="button"
        disabled={disabled || isExporting}
        onClick={async () => {
          setIsExporting(true)
          setExportError("")
          try {
            const circuitJson = await loadPrebuiltCircuitJson({ url: circuitJsonUrl })
            downloadCircuitJson(circuitJson, fileName)
          } catch (error) {
            const reason = error instanceof Error ? error.message : String(error)
            setExportError(`Could not export PCB Circuit JSON. ${reason}`)
          } finally {
            setIsExporting(false)
          }
        }}
      >
        {isExporting ? "Preparing PCB export…" : "Export PCB Circuit JSON"}
      </button>
      {exportError && (
        <p className="render-error" role="alert">
          {exportError}
        </p>
      )}
    </>
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
