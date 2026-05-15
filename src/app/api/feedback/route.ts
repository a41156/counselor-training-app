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
  const { transcript, role, language } = await req.json()

  const systemPrompt = PEDAGOGICAL_LENSES[role as keyof typeof PEDAGOGICAL_LENSES] || PEDAGOGICAL_LENSES.student

  const languageInstruction = language === "simplified-chinese"
    ? "Please respond in Simplified Chinese (簡體中文)."
    : language === "english"
    ? "Please respond in English."
    : "Please respond in Traditional Chinese (繁體中文)."

  const response = await fetch("https://api.minimax.chat/v1/text/chatcompletion_v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.MINIMAX_API_KEY}`,
    },
    body: JSON.stringify({
      model: "MiniMax-M2.7",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `${languageInstruction}\n\nProvide pedagogical feedback on this counseling session transcript:\n\n${transcript}` },
      ],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error("MiniMax error:", response.status, error)
    return NextResponse.json({ error: "AI feedback failed" }, { status: 500 })
  }

  const data = await response.json()
  console.log("MiniMax feedback response:", JSON.stringify(data).slice(0, 300))
  const feedback = data.choices?.[0]?.message?.content || data.error || "No feedback generated"

  return NextResponse.json({ feedback })
}