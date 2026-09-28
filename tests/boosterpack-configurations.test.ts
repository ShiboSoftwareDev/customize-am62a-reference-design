import { expect, test } from "bun:test"
import { boosterPackBoards, boosterPackSourceCommit } from "lib/boosterpack-configurations"

test("prebuilds the complete removable-feature powerset for every board", () => {
  const configurations = boosterPackBoards.flatMap(({ configurations }) => configurations)

  expect(boosterPackBoards).toHaveLength(5)
  expect(boosterPackBoards.map(({ configurations }) => configurations.length)).toEqual([
    128, 4, 16, 32, 32,
  ])
  expect(configurations).toHaveLength(212)
  expect(new Set(boosterPackBoards.map(({ id }) => id)).size).toBe(5)
  expect(new Set(configurations.map(({ id }) => id)).size).toBe(212)

  for (const board of boosterPackBoards) {
    expect(board.sourceUrl).toContain(boosterPackSourceCommit)
    expect(board.configurations).toHaveLength(2 ** board.removableFeatures.length)
    expect(board.configurations[0].removedFeatureIds).toEqual([])
    expect(board.configurations.at(-1)?.removedFeatureIds).toEqual(
      board.removableFeatures.map(({ id }) => id),
    )
  }

  for (const configuration of configurations) {
    expect(configuration.circuitJsonUrl).toBe(
      `/prebuilt-boosterpacks/${configuration.id}.circuit.json.gz`,
    )
  }
})
