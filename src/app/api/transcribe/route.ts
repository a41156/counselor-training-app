import { NextRequest } from "next/server"
import { streamText } from "ai"
import { minimax } from "vercel-minimax-ai-provider"

const model = minimax("MiniMax-M2")

export async function POST(req: NextRequest) {
  const { audioUrl } = await req.json()

  const result = await streamText({
    model,
    messages: [
      {
        role: "system",
        content: `You are a clinical transcriptionist. Transcribe the following audio URL into a JSON response with this exact format:
{
  "speaker_a": "counsellor text here",
  "speaker_b": "client text here"
}
Only respond with valid JSON, no markdown or explanation.`,
      },
      {
        role: "user",
        content: `Transcribe this audio: ${audioUrl}`,
      },
    ],
  })

  return result.toTextStreamResponse()
}