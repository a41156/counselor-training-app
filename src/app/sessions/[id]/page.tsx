"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Download, Mic, User } from "lucide-react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import type { UIMessage, TextUIPart } from "ai"

interface Transcript {
  rawText: string
  speakerA: string
  speakerB: string
}

function getTextContent(message: UIMessage): string {
  return message.parts
    .filter((part): part is TextUIPart => part.type === "text")
    .map(part => part.text)
    .join("")
}

const feedbackTransport = new DefaultChatTransport({ api: "/api/feedback" })

export default function SessionPage() {
  const params = useParams()
  const [session, setSession] = useState<{ id: string; title: string; audioUrl: string; status: string } | null>(null)
  const [transcript, setTranscript] = useState<Transcript | null>(null)
  const [loading, setLoading] = useState(true)
  const { messages, sendMessage, status } = useChat({
    transport: feedbackTransport,
  })

  const isLoading = status === "streaming" || status === "submitted"

  useEffect(() => {
    const fetchSession = async () => {
      const res = await fetch(`/api/sessions/${params.id}`)
      const data = await res.json()
      setSession(data.session)
      setTranscript(data.transcript)
      setLoading(false)
    }
    fetchSession()
  }, [params.id])

  useEffect(() => {
    if (transcript?.rawText && messages.length === 0) {
      sendMessage({
        text: `Provide pedagogical feedback on this counseling session transcript:\n\n${transcript.rawText}`,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript])

  const exportToWord = async () => {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import("docx")
    const assistantMessages = messages.filter(m => m.role === "assistant")
    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: session?.title || "Session Transcript",
              heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({
              text: "Transcript",
              heading: HeadingLevel.HEADING_2,
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Counsellor: ", bold: true }),
                new TextRun(transcript?.speakerA || ""),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Client: ", bold: true }),
                new TextRun(transcript?.speakerB || ""),
              ],
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              text: "AI Feedback",
              heading: HeadingLevel.HEADING_2,
            }),
            new Paragraph({
              children: assistantMessages
                .map((m: UIMessage) => new TextRun(getTextContent(m)))
                .flat(),
            }),
          ],
        },
      ],
    })
    const blob = await Packer.toBlob(doc)
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${session?.title || "session"}-transcript.docx`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  if (!session) {
    return <div className="p-8 text-center">Session not found</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <header className="border-b bg-white/80 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
            <h1 className="font-semibold text-slate-900 dark:text-white">{session.title}</h1>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                session.status === "completed"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
              }`}
            >
              {session.status}
            </span>
          </div>
          <button
            onClick={exportToWord}
            disabled={!transcript}
            className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Download className="h-4 w-4" />
            Export to Word
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-6">
        <div className="grid h-[calc(100vh-12rem)] gap-6 lg:grid-cols-2">
          <div className="flex flex-col rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-4 dark:border-slate-700">
              <Mic className="h-5 w-5 text-blue-500" />
              <h2 className="font-semibold text-slate-900 dark:text-white">Transcript</h2>
            </div>
            <div className="flex-1 overflow-auto p-6">
              {!transcript ? (
                <div className="flex h-full items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="rounded-xl bg-blue-50 p-4 dark:bg-blue-900/20">
                    <div className="mb-2 flex items-center gap-2">
                      <User className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-900 dark:text-blue-300">
                        Counsellor (Speaker A)
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{transcript.speakerA}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-700/50">
                    <div className="mb-2 flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-600" />
                      <span className="font-medium text-slate-900 dark:text-slate-300">
                        Client (Speaker B)
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{transcript.speakerB}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-4 dark:border-slate-700">
              <div className="h-5 w-5 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600" />
              <h2 className="font-semibold text-slate-900 dark:text-white">Pedagogical Lens</h2>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {messages.map((m: UIMessage) =>
                  m.role === "assistant" ? (
                    <div key={m.id} className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
                      {getTextContent(m)}
                    </div>
                  ) : null
                )}
                {isLoading && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                    Generating feedback...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}