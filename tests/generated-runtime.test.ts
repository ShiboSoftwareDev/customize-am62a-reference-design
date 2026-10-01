import { expect, test } from "bun:test"

test("generated board runtime uses the production-safe JSX transform", async () => {
  const runtimePath = new URL("../lib/generated/am62a-board.runtime.js", import.meta.url)
  const runtimeHeader = await Bun.file(runtimePath).slice(0, 256).text()

  expect(runtimeHeader).toContain('from"react/jsx-runtime"')
  expect(runtimeHeader).not.toContain("react/jsx-dev-runtime")
})
