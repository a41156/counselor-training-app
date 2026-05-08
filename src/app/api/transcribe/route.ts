import { NextRequest, NextResponse } from "next/server"

interface DeepgramWord {
  word: string
  start: number
  end: number
  speaker?: number
  punctuated_word?: string
}

interface DeepgramAlternative {
  transcript: string
  words: DeepgramWord[]
}

interface DeepgramChannel {
  alternatives: DeepgramAlternative[]
}

interface DeepgramResult {
  results?: {
    channels?: DeepgramChannel[]
  }
}

export async function POST(req: NextRequest) {
  const { audioUrl } = await req.json()

  if (!audioUrl) {
    return NextResponse.json({ error: "No audio URL provided" }, { status: 400 })
  }

  try {
    const response = await fetch(
      `https://api.deepgram.com/v1/listen?language=en&smart_format=true&punctuate=true&diarize=true`,
      {
        method: "POST",
        headers: {
          Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: audioUrl,
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Deepgram error:", response.status, errorText)
      return NextResponse.json({ error: "Transcription failed" }, { status: 500 })
    }

    const data: DeepgramResult = await response.json()

    const words = data?.results?.channels?.[0]?.alternatives?.[0]?.words || []
    const transcript = data?.results?.channels?.[0]?.alternatives?.[0]?.transcript || ""

    const speakerMap: Record<number, string[]> = {}

    for (const word of words) {
      const speaker = word.speaker ?? 0
      const text = word.punctuated_word || word.word
      if (!speakerMap[speaker]) {
        speakerMap[speaker] = []
      }
      speakerMap[speaker].push(text)
    }

    const speakers = Object.entries(speakerMap)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([, words]) => words.join(" "))

    const speakerA = speakers[0] || transcript
    const speakerB = speakers[1] || ""

    const rawText = `Counsellor: ${speakerA}${speakerB ? `\n\nClient: ${speakerB}` : ""}`

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