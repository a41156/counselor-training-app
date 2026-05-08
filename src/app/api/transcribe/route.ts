import { NextRequest, NextResponse } from "next/server"

interface ScribeNodeTranscript {
  text: string
  segments?: Array<{
    start: number
    end: number
    speaker?: string
    text: string
  }>
  speaker_a?: string
  speaker_b?: string
}

export async function POST(req: NextRequest) {
  const { audioUrl } = await req.json()

  if (!audioUrl) {
    return NextResponse.json({ error: "No audio URL provided" }, { status: 400 })
  }

  try {
    const response = await fetch("https://scribe-node.9gen.ai/transcribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SCRIBENODE_API_KEY}`,
      },
      body: JSON.stringify({
        audio_url: audioUrl,
        speaker_labels: true,
        language: "en",
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("ScribeNode error:", response.status, errorText)
      return NextResponse.json({ error: "Transcription failed" }, { status: 500 })
    }

    const data: ScribeNodeTranscript = await response.json()

    const speakerA = data.segments
      ?.filter((s) => s.speaker === "A" || s.speaker === "1")
      .map((s) => s.text)
      .join(" ") || data.speaker_a || ""

    const speakerB = data.segments
      ?.filter((s) => s.speaker === "B" || s.speaker === "2")
      .map((s) => s.text)
      .join(" ") || data.speaker_b || ""

    const rawText = `Counsellor: ${speakerA}\n\nClient: ${speakerB}`

    return NextResponse.json({
      rawText,
      speakerA,
      speakerB,
    })
  } catch (error) {
    console.error("Transcription error:", error)
    return NextResponse.json({ error: "Transcription failed" }, { status: 500 })
  }
}