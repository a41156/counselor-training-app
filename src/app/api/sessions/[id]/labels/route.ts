import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { transcripts } from "@/db/schema"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { speakerLabels } = await req.json()

  await db
    .update(transcripts)
    .set({ speakerLabels: JSON.stringify(speakerLabels) })
    .where(eq(transcripts.sessionId, id))

  return NextResponse.json({ success: true })
}