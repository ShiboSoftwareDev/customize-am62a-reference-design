import { tiEvms, type TiEvm, type TiEvmId, type TiEvmVariant } from "lib/ti-evm-catalog"

type ConfigurationPanelProps = {
  evm: TiEvm
  variant: TiEvmVariant
  schematicPageId: string
  statusText: string
  error: string
  onEvmChange: (evmId: TiEvmId) => void
  onVariantChange: (variantId: string) => void
  onSchematicPageChange: (pageId: string) => void
  onRetry: () => void
  onExportCircuitJson: () => void
  canExportCircuitJson: boolean
}

export function ConfigurationPanel(props: ConfigurationPanelProps) {
  return (
    <aside className="configuration-panel">
      <header className="board-title">
        <span className="eyebrow">Source-backed board configurator</span>
        <h1>TI evaluation modules</h1>
      </header>

      <label className="select-field">
        <span>Evaluation module</span>
        <select
          value={props.evm.id}
          onChange={(event) => props.onEvmChange(event.currentTarget.value as TiEvmId)}
        >
          {tiEvms.map((evm) => (
            <option key={evm.id} value={evm.id}>
              {evm.name}
            </option>
          ))}
        </select>
      </label>

      <div className="evm-summary">
        <small>{props.evm.category}</small>
        <strong>{props.evm.name}</strong>
        <p>{props.evm.description}</p>
      </div>

      <label className="select-field">
        <span>Variant</span>
        <select
          value={props.variant.id}
          onChange={(event) => props.onVariantChange(event.currentTarget.value)}
        >
          {props.evm.variants.map((variant) => (
            <option key={variant.id} value={variant.id}>
              {variant.label}
            </option>
          ))}
        </select>
      </label>

      <p className="variant-description">{props.variant.description}</p>

      {props.variant.schematicPages && (
        <label className="select-field">
          <span>Schematic page</span>
          <select
            value={props.schematicPageId}
            onChange={(event) => props.onSchematicPageChange(event.currentTarget.value)}
          >
            {props.variant.schematicPages.map((page) => (
              <option key={page.id} value={page.id}>
                {page.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="source-links">
        <a href={props.evm.sourceUrl} rel="noreferrer" target="_blank">
          {props.evm.sourceLabel} ↗
        </a>
      </div>

      <button
        className="export-json-button"
        type="button"
        disabled={!props.canExportCircuitJson}
        onClick={props.onExportCircuitJson}
      >
        Export PCB Circuit JSON
      </button>

      <p className="render-status" role="status">
        {props.statusText}
      </p>
      {props.error && (
        <div className="render-error" role="alert">
          <p>{props.error}</p>
          <button type="button" onClick={props.onRetry}>
            Retry load
          </button>
        </div>
      )}
    </aside>
  )
}
