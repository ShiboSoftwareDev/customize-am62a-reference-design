import type { BoardRenderError, BoardRenderResponse } from "lib/api-types"

export async function parseBoardRenderResponse(response: Response): Promise<BoardRenderResponse> {
  const responseText = await response.text()
  let responseBody: BoardRenderResponse | BoardRenderError

  try {
    responseBody = JSON.parse(responseText) as BoardRenderResponse | BoardRenderError
  } catch {
    if (!response.ok) {
      throw new Error(responseText.trim() || `Board render failed (${response.status})`)
    }
    throw new Error("Board render returned an invalid response")
  }

  if (!response.ok || "error" in responseBody) {
    throw new Error("error" in responseBody ? responseBody.error : "Board render failed")
  }

  return responseBody
}
