import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { sessions, transcripts } from "@/db/schema"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const sessionData = await db.query.sessions.findFirst({
    where: eq(sessions.id, id),
  })

  if (!sessionData) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const transcriptData = await db.query.transcripts.findFirst({
    where: eq(transcripts.sessionId, id),
  })

  console.log("Session API - transcript:", JSON.stringify(transcriptData)?.slice(0, 500))
  console.log("Session API - utterances field:", transcriptData?.utterances ? "present" : "missing")

  return NextResponse.json({
    session: sessionData,
    transcript: transcriptData,
  })
}