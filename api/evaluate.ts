import type { VercelRequest, VercelResponse } from "@vercel/node"
import { evaluateBoard } from "../lib/server/evaluate-board"
import { normalizeRenderRequest } from "../lib/server/normalize-render-request"

export default async function handleEvaluate(request: VercelRequest, response: VercelResponse) {
  if (request.method !== "POST") return response.status(405).json({ error: "POST required" })

  try {
    return response.status(200).json(await evaluateBoard(normalizeRenderRequest(request.body)))
  } catch (error) {
    return response.status(500).json({
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
