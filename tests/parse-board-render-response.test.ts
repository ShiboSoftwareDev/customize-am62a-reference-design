import { expect, test } from "bun:test"
import { parseBoardRenderResponse } from "app/parse-board-render-response"

test("reports a plain-text deployment error without JSON parser noise", async () => {
  const response = new Response("An error occurred while rendering the board", { status: 504 })

  await expect(parseBoardRenderResponse(response)).rejects.toThrow(
    "An error occurred while rendering the board",
  )
})
