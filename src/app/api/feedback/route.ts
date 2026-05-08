import { NextRequest, NextResponse } from "next/server"

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

  const systemPrompt = PEDAGOGICAL_LENSES[role as keyof typeof PEDAGOGICAL_LENSES] || PEDAGOGICAL_LENSES.student

  const response = await fetch("https://api.minimax.chat/v1/text/chatcompletion_v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.MINIMAX_API_KEY}`,
    },
    body: JSON.stringify({
      model: "MiniMax-M2",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Provide pedagogical feedback on this counseling session transcript:\n\n${transcript}` },
      ],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error("MiniMax error:", response.status, error)
    return NextResponse.json({ error: "AI feedback failed" }, { status: 500 })
  }

  const data = await response.json()
  const feedback = data.choices?.[0]?.message?.content || ""

  return NextResponse.json({ feedback })
}