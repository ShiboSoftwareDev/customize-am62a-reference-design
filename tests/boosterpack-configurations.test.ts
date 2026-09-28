import { expect, test } from "bun:test"
import { boosterPackBoards, boosterPackSourceCommit } from "lib/boosterpack-configurations"

test("defines five boards and ten unique prebuilt configurations", () => {
  const configurations = boosterPackBoards.flatMap(({ configurations }) => configurations)

  expect(boosterPackBoards).toHaveLength(5)
  expect(configurations).toHaveLength(10)
  expect(new Set(boosterPackBoards.map(({ id }) => id)).size).toBe(5)
  expect(new Set(configurations.map(({ id }) => id)).size).toBe(10)
  for (const board of boosterPackBoards) expect(board.sourceUrl).toContain(boosterPackSourceCommit)
  for (const configuration of configurations) {
    expect(configuration.circuitJsonUrl).toBe(
      `/prebuilt-boosterpacks/${configuration.id}.circuit.json.gz`,
    )
  }
})
