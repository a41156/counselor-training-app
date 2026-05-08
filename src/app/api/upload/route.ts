import { NextRequest, NextResponse } from "next/server"
import { v2 as cloudinary } from "cloudinary"
import { db } from "@/db"
import { sessions, transcripts } from "@/db/schema"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"

if (process.env.CLOUDINARY_URL) {
  cloudinary.config(process.env.CLOUDINARY_URL)
} else {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await req.formData()
  const audio = formData.get("audio") as File

  if (!audio) {
    return NextResponse.json({ error: "No audio file" }, { status: 400 })
  }

  try {
    const arrayBuffer = await audio.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString("base64")
    const dataUri = `data:${audio.type};base64,${base64}`

    const uploadResult = await cloudinary.uploader.upload(dataUri, {
      resource_type: "raw",
      folder: "counselor-training",
      timeout: 120000,
    })

    const sessionId = crypto.randomUUID()
    await db.insert(sessions).values({
      id: sessionId,
      userId: session.user.id,
      title: audio.name.replace(/\.[^/.]+$/, ""),
      audioUrl: uploadResult.secure_url,
      status: "processing",
      createdAt: new Date(),
    })

    const deepgramRes = await fetch(
      `https://api.deepgram.com/v1/listen?language=en&smart_format=true&punctuate=true&diarize=true`,
      {
        method: "POST",
        headers: {
          Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
          "Content-Type": "audio/mp4",
        },
        body: buffer,
      }
    )

    console.log("Deepgram response status:", deepgramRes.status)
    const data = await deepgramRes.json()
    console.log("Deepgram response data:", JSON.stringify(data).slice(0, 500))
    console.log("Audio size:", buffer.length, "type:", audio.type)

    if (deepgramRes.ok && data?.results?.channels?.[0]?.alternatives?.[0]?.transcript) {
      const words = data?.results?.channels?.[0]?.alternatives?.[0]?.words || []
      const transcriptText = data?.results?.channels?.[0]?.alternatives?.[0]?.transcript || ""

      const speakerMap: Record<number, string[]> = {}
      for (const word of words) {
        const speaker = word.speaker ?? 0
        const text = word.punctuated_word || word.word
        if (!speakerMap[speaker]) speakerMap[speaker] = []
        speakerMap[speaker].push(text)
      }

      const speakers = Object.entries(speakerMap)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([, w]) => w.join(" "))

      const speakerA = speakers[0] || transcriptText
      const speakerB = speakers[1] || ""
      const rawText = `Counsellor: ${speakerA}${speakerB ? `\n\nClient: ${speakerB}` : ""}`

      await db.insert(transcripts).values({
        id: crypto.randomUUID(),
        sessionId,
        rawText,
        speakerA,
        speakerB,
        createdAt: new Date(),
      })

      await db.update(sessions).set({ status: "completed" }).where(eq(sessions.id, sessionId))
    }

    return NextResponse.json({ sessionId })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}