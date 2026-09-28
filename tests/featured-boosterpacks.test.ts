import { expect, test } from "bun:test"
import {
  boosterPackCatalogUrl,
  boosterPackSourceRepositoryUrl,
  featuredBoosterPacks,
} from "lib/featured-boosterpacks"

test("features five BoosterPacks linked to the canonical catalog and repository", () => {
  const slugs = featuredBoosterPacks.map(({ slug }) => slug)

  expect(featuredBoosterPacks).toHaveLength(5)
  expect(new Set(slugs).size).toBe(5)
  for (const boosterPack of featuredBoosterPacks) {
    expect(boosterPack.detailUrl).toBe(`${boosterPackCatalogUrl}boards/${boosterPack.slug}/`)
    expect(boosterPack.thumbnailUrl).toBe(
      `${boosterPackCatalogUrl}boards/${boosterPack.slug}/thumbnail.png`,
    )
    expect(boosterPack.sourceUrl).toBe(
      `${boosterPackSourceRepositoryUrl}/tree/main/${boosterPack.slug}`,
    )
  }
})
