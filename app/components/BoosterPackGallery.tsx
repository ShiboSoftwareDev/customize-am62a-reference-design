import { useEffect, useState } from "react"
import {
  boosterPackCatalogUrl,
  boosterPackSourceRepositoryUrl,
  featuredBoosterPacks,
} from "lib/featured-boosterpacks"

type BoosterPackGalleryProps = {
  onClose: () => void
}

export function BoosterPackGallery({ onClose }: BoosterPackGalleryProps) {
  const [selectedSlug, setSelectedSlug] = useState(featuredBoosterPacks[0].slug)
  const selectedBoosterPack =
    featuredBoosterPacks.find(({ slug }) => slug === selectedSlug) ?? featuredBoosterPacks[0]

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", closeOnEscape)
    return () => window.removeEventListener("keydown", closeOnEscape)
  }, [onClose])

  return (
    <div className="boosterpack-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="boosterpack-gallery-title"
        aria-modal="true"
        className="boosterpack-dialog"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="boosterpack-header">
          <div>
            <span className="eyebrow">TI LaunchPad ecosystem examples</span>
            <h2 id="boosterpack-gallery-title">Explore tscircuit BoosterPacks</h2>
            <p>
              Five real boards from the open-source BoosterPack catalog. These examples are not
              validated as direct SK-AM62A header add-ons.
            </p>
          </div>
          <button
            aria-label="Close BoosterPack gallery"
            className="dialog-close"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </header>

        <div className="boosterpack-layout">
          <nav aria-label="Featured BoosterPacks" className="boosterpack-list">
            {featuredBoosterPacks.map((boosterPack) => (
              <button
                aria-pressed={boosterPack.slug === selectedSlug}
                className="boosterpack-card"
                key={boosterPack.slug}
                onClick={() => setSelectedSlug(boosterPack.slug)}
                type="button"
              >
                <img alt="" loading="lazy" src={boosterPack.thumbnailUrl} />
                <span>
                  <small>{boosterPack.category}</small>
                  <strong>{boosterPack.name}</strong>
                  <span>{boosterPack.description}</span>
                </span>
              </button>
            ))}
          </nav>

          <div className="boosterpack-embed">
            <div className="boosterpack-embed-toolbar">
              <strong>{selectedBoosterPack.name}</strong>
              <span>{selectedBoosterPack.category}</span>
            </div>
            <div className="boosterpack-preview">
              <img
                alt={`${selectedBoosterPack.name} rendered board preview`}
                key={selectedBoosterPack.slug}
                src={selectedBoosterPack.thumbnailUrl}
              />
              <div>
                <span className="eyebrow">Repository example</span>
                <h3>{selectedBoosterPack.name}</h3>
                <p>{selectedBoosterPack.description}</p>
                <div className="boosterpack-preview-links">
                  <a href={selectedBoosterPack.detailUrl} rel="noreferrer" target="_blank">
                    Open full design ↗
                  </a>
                  <a href={selectedBoosterPack.sourceUrl} rel="noreferrer" target="_blank">
                    View board source ↗
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className="boosterpack-footer">
          <a href={boosterPackCatalogUrl} rel="noreferrer" target="_blank">
            Browse all BoosterPacks ↗
          </a>
          <a href={boosterPackSourceRepositoryUrl} rel="noreferrer" target="_blank">
            View the tscircuit/boosters repository ↗
          </a>
        </footer>
      </section>
    </div>
  )
}
