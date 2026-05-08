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
      resource_type: "auto",
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

    const transcriptRes = await fetch("http://localhost:3000/api/transcribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audioUrl: uploadResult.secure_url }),
    })

    if (transcriptRes.ok) {
      const { rawText, speakerA, speakerB } = await transcriptRes.json()
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