import { expect, test } from "bun:test"
import { boosterPackBoards, boosterPackSourceCommit } from "lib/boosterpack-configurations"

test("defines five boards with variable-length unique configuration sets", () => {
  const configurations = boosterPackBoards.flatMap(({ configurations }) => configurations)

  expect(boosterPackBoards).toHaveLength(5)
  expect(boosterPackBoards.map(({ configurations }) => configurations.length)).toEqual([
    8, 4, 15, 4, 6,
  ])
  expect(configurations).toHaveLength(37)
  expect(new Set(boosterPackBoards.map(({ id }) => id)).size).toBe(5)
  expect(new Set(configurations.map(({ id }) => id)).size).toBe(37)
  expect(
    configurations.find(({ id }) => id === "boost_drv8848_power_indicator")?.excludedElementNames,
  ).toEqual(["D1", "R2"])
  expect(
    configurations.find(({ id }) => id === "boost_drv8848_fault_indicator")?.excludedElementNames,
  ).toEqual(["D2", "R6"])
  for (const board of boosterPackBoards) expect(board.sourceUrl).toContain(boosterPackSourceCommit)
  for (const configuration of configurations) {
    expect(configuration.circuitJsonUrl).toBe(
      `/prebuilt-boosterpacks/${configuration.id}.circuit.json.gz`,
    )
  }
})
