import type { VercelRequest, VercelResponse } from "@vercel/node"
import { getBoardSource } from "../lib/server/get-board-source"
import { normalizeRenderRequest } from "../lib/server/normalize-render-request"

export default async function handleSource(request: VercelRequest, response: VercelResponse) {
  if (request.method !== "POST") return response.status(405).send("POST required")

  try {
    response.setHeader("Content-Type", "text/plain; charset=utf-8")
    return response.status(200).send(await getBoardSource(normalizeRenderRequest(request.body)))
  } catch (error) {
    return response.status(500).send(error instanceof Error ? error.message : String(error))
  }
}
