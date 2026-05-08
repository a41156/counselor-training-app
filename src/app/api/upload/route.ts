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

    console.log("Uploaded to Cloudinary:", uploadResult.secure_url)

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
      "https://api.deepgram.com/v1/listen?diarize=true&paragraphs=true&punctuate=true&smart_format=true&utt_split=0.7&utterances=true&language=zh-HK&model=nova-3",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: uploadResult.secure_url }),
      }
    )

    console.log("Deepgram status:", deepgramRes.status)
    const data = await deepgramRes.json()
    console.log("Deepgram response:", JSON.stringify(data).slice(0, 500))

    const words = data?.results?.channels?.[0]?.alternatives?.[0]?.words || []
    const paragraphs = data?.results?.paragraphs?.paragraphs || []
    const utterances = data?.results?.utterances || []
    const transcriptText = data?.results?.channels?.[0]?.alternatives?.[0]?.transcript || ""

    let speakerA = ""
    let speakerB = ""
    let rawText = ""

    if (paragraphs.length > 0) {
      const speakerMap: Record<number, string[]> = {}
      for (const para of paragraphs) {
        const speaker = para.speaker ?? 0
        if (!speakerMap[speaker]) speakerMap[speaker] = []
        speakerMap[speaker].push(para.text)
      }
      const speakers = Object.entries(speakerMap)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([, texts]) => texts.join(" "))
      speakerA = speakers[0] || ""
      speakerB = speakers[1] || ""
      rawText = `Counsellor: ${speakerA}${speakerB ? `\n\nClient: ${speakerB}` : ""}`
    } else if (utterances.length > 0) {
      const speakerMap: Record<number, string[]> = {}
      for (const utt of utterances) {
        const speaker = utt.speaker ?? 0
        if (!speakerMap[speaker]) speakerMap[speaker] = []
        speakerMap[speaker].push(utt.text)
      }
      const speakers = Object.entries(speakerMap)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([, texts]) => texts.join(" "))
      speakerA = speakers[0] || ""
      speakerB = speakers[1] || ""
      rawText = `Counsellor: ${speakerA}${speakerB ? `\n\nClient: ${speakerB}` : ""}`
    } else if (words.length > 0) {
      const speakerMap: Record<number, string[]> = {}
      for (const word of words) {
        const speaker = word.speaker ?? 0
        if (!speakerMap[speaker]) speakerMap[speaker] = []
        speakerMap[speaker].push(word.punctuated_word || word.word)
      }
      const speakers = Object.entries(speakerMap)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([, w]) => w.join(" "))
      speakerA = speakers[0] || ""
      speakerB = speakers[1] || ""
      rawText = `Counsellor: ${speakerA}${speakerB ? `\n\nClient: ${speakerB}` : ""}`
    } else if (transcriptText) {
      speakerA = transcriptText
      speakerB = ""
      rawText = `Counsellor: ${speakerA}`
    }

    console.log("Speaker A:", speakerA.slice(0, 50))
    console.log("Speaker B:", speakerB.slice(0, 50))

    if (speakerA || speakerB) {
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