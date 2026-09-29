import { useEffect, useState } from "react"
import type { TiEvm } from "lib/ti-evm-catalog"

export function BoardDetailPage({ evm }: { evm: TiEvm }) {
  const assetRoot = `/board-details/${evm.id}`
  const [sourceCode, setSourceCode] = useState("")
  const [sourceError, setSourceError] = useState("")

  useEffect(() => {
    const controller = new AbortController()
    setSourceCode("")
    setSourceError("")

    fetch(`${assetRoot}/source.tsx`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Source request failed with ${response.status}`)
        return response.text()
      })
      .then(setSourceCode)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return
        setSourceError(error instanceof Error ? error.message : "Unable to load TSX source")
      })

    return () => controller.abort()
  }, [assetRoot])

  return (
    <main className="board-detail-page">
      <header className="board-detail-header">
        <div>
          <a className="back-link" href="/">
            ← TI EVM configurator
          </a>
          <span className="eyebrow">Canonical full-board render</span>
          <h1>{evm.name}</h1>
          <p>{evm.description}</p>
        </div>
        <div className="board-detail-actions">
          <a href={evm.sourceUrl} rel="noreferrer" target="_blank">
            Official TI reference ↗
          </a>
          <a href={`${assetRoot}/source.tsx`}>Download TSX</a>
        </div>
      </header>

      <section className="board-render-grid" aria-label={`${evm.name} renders`}>
        <RenderCard
          className="three-d-render-card"
          href={`${assetRoot}/3d.png`}
          imageUrl={`${assetRoot}/3d.png`}
          title="3D"
          description="Static 3D snapshot rendered from the full-board Circuit JSON."
          alt={`${evm.name} 3D board render`}
        />
        <RenderCard
          href={`${assetRoot}/pcb.svg`}
          imageUrl={`${assetRoot}/pcb.svg`}
          title="PCB"
          description="Reference placement and geometry with tscircuit autorouted copper."
          alt={`${evm.name} PCB SVG`}
        />
        <RenderCard
          href={`${assetRoot}/schematic.svg`}
          imageUrl={`${assetRoot}/schematic.svg`}
          title="Schematic"
          description="Schematic SVG generated from the same full-board TSX render."
          alt={`${evm.name} schematic SVG`}
        />
      </section>

      <section className="source-code-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Parameterized source</span>
            <h2>{evm.sourcePath}</h2>
          </div>
          <a href={evm.sourceUrl} rel="noreferrer" target="_blank">
            {evm.sourceLabel} ↗
          </a>
        </div>
        <pre>
          <code>{sourceError || sourceCode || "Loading TSX source…"}</code>
        </pre>
      </section>
    </main>
  )
}

function RenderCard(props: {
  alt: string
  className?: string
  description: string
  href: string
  imageUrl: string
  title: string
}) {
  return (
    <article className={`board-render-card ${props.className ?? ""}`}>
      <div className="render-card-heading">
        <div>
          <h2>{props.title}</h2>
          <p>{props.description}</p>
        </div>
        <a href={props.href} target="_blank" rel="noreferrer">
          Open image ↗
        </a>
      </div>
      <a className="render-image-link" href={props.href} target="_blank" rel="noreferrer">
        <img src={props.imageUrl} alt={props.alt} />
      </a>
    </article>
  )
}
