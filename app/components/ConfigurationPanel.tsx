import {
  boosterPackBoards,
  boosterPackSourceRepositoryUrl,
  type BoosterPackBoard,
  type BoosterPackConfiguration,
  type BoosterPackConfigurationId,
  type BoosterPackId,
} from "lib/boosterpack-configurations"

type ConfigurationPanelProps = {
  board: BoosterPackBoard
  configuration: BoosterPackConfiguration
  statusText: string
  error: string
  onBoardChange: (boardId: BoosterPackId) => void
  onConfigurationChange: (configurationId: BoosterPackConfigurationId) => void
  onRetry: () => void
  onExportCircuitJson: () => void
  canExportCircuitJson: boolean
}

export function ConfigurationPanel(props: ConfigurationPanelProps) {
  return (
    <aside className="configuration-panel">
      <header className="board-title">
        <span className="eyebrow">Source-backed board configurator</span>
        <h1>TI BoosterPacks</h1>
        <p>
          Select a real tscircuit board and one of its meaningful prebuilt configurations. Each
          board exposes the options supported by its functional blocks.
        </p>
      </header>

      <fieldset className="board-picker">
        <legend>Board</legend>
        {boosterPackBoards.map((boosterPack) => (
          <label
            className="board-choice"
            data-selected={boosterPack.id === props.board.id}
            key={boosterPack.id}
          >
            <input
              checked={boosterPack.id === props.board.id}
              name="boosterpack-board"
              onChange={() => props.onBoardChange(boosterPack.id)}
              type="radio"
            />
            <img alt="" src={boosterPack.thumbnailUrl} />
            <span>
              <small>{boosterPack.category}</small>
              <strong>{boosterPack.name}</strong>
            </span>
          </label>
        ))}
      </fieldset>

      <fieldset className="configuration-options">
        <legend>Configuration ({props.board.configurations.length})</legend>
        {props.board.configurations.map((configuration) => (
          <label
            className="configuration-choice"
            data-selected={configuration.id === props.configuration.id}
            key={configuration.id}
          >
            <input
              checked={configuration.id === props.configuration.id}
              name="board-configuration"
              onChange={() => props.onConfigurationChange(configuration.id)}
              type="radio"
            />
            <span>
              <strong>{configuration.label}</strong>
              <small>{configuration.description}</small>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="source-links">
        <a href={props.board.sourceUrl} rel="noreferrer" target="_blank">
          View this board’s TSX ↗
        </a>
        <a href={boosterPackSourceRepositoryUrl} rel="noreferrer" target="_blank">
          All BoosterPacks ↗
        </a>
      </div>

      <button
        className="export-json-button"
        type="button"
        disabled={!props.canExportCircuitJson}
        onClick={props.onExportCircuitJson}
      >
        Export selected Circuit JSON
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
