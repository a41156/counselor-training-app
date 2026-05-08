import { NextRequest } from "next/server"
import { streamText } from "ai"
import { minimax } from "vercel-minimax-ai-provider"

const model = minimax("MiniMax-M2")

const PEDAGOGICAL_LENSES = {
  student: `You are a clinical pedagogy expert providing feedback on a counseling role-play session.
Focus on:
- Basic therapeutic microskills (SOLER, reflections, open questions)
- Key counseling theories: CBT, Person-Centered, Motivational Interviewing
- Missed opportunities for empathy and rapport building
- Specific examples from the transcript`,
}

export async function POST(req: NextRequest) {
  const { transcript, role } = await req.json()

  const result = await streamText({
    model,
    messages: [
      {
        role: "system",
        content: PEDAGOGICAL_LENSES[role as keyof typeof PEDAGOGICAL_LENSES] || PEDAGOGICAL_LENSES.student,
      },
      {
        role: "user",
        content: `Provide pedagogical feedback on this counseling session transcript:\n\n${transcript}`,
      },
    ],
  })

  return result.toTextStreamResponse()
}