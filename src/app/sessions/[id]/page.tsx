"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Download, Mic, User, Check } from "lucide-react"

interface Utterance {
  start: number
  end: number
  transcript: string
  speaker: number
}

interface Transcript {
  rawText: string
  utterances: Utterance[]
  speakerLabels: Record<number, string> | null
}

export default function SessionPage() {
  const params = useParams()
  const [session, setSession] = useState<{ id: string; title: string; audioUrl: string; status: string } | null>(null)
  const [transcript, setTranscript] = useState<Transcript | null>(null)
  const [feedback, setFeedback] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [feedbackLoaded, setFeedbackLoaded] = useState(false)
  const [speakerLabels, setSpeakerLabels] = useState<Record<number, string>>({})
  const [labelsConfirmed, setLabelsConfirmed] = useState(false)

  useEffect(() => {
    const fetchSession = async () => {
      const res = await fetch(`/api/sessions/${params.id}`)
      const data = await res.json()
      setSession(data.session)
      if (data.transcript) {
        const utterances = data.transcript.utterances ? JSON.parse(data.transcript.utterances) : []
        setTranscript({
          rawText: data.transcript.rawText || "",
          utterances,
          speakerLabels: data.transcript.speakerLabels ? JSON.parse(data.transcript.speakerLabels) : null,
        })
        if (data.transcript.speakerLabels) {
          setSpeakerLabels(JSON.parse(data.transcript.speakerLabels))
          setLabelsConfirmed(true)
        }
      }
      setLoading(false)
    }
    fetchSession()
  }, [params.id])

  useEffect(() => {
    if (transcript?.rawText && !feedback) {
      setFeedbackLoading(true)
      fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: transcript.rawText, role: "student" }),
      })
        .then((res) => res.json())
        .then((data) => {
          console.log("Feedback API response:", JSON.stringify(data).slice(0, 200))
          setFeedback(data.feedback || data.error || "No feedback generated")
          setFeedbackLoading(false)
          setFeedbackLoaded(true)
        })
        .catch((err) => {
          console.error("Feedback API error:", err)
          setFeedback("Failed to generate feedback")
          setFeedbackLoading(false)
          setFeedbackLoaded(true)
        })
    }
  }, [transcript, feedback])

  const assignSpeakerLabel = (speakerNum: number, label: string) => {
    setSpeakerLabels((prev) => ({ ...prev, [speakerNum]: label }))
  }

  const confirmLabels = async () => {
    setLabelsConfirmed(true)
    await fetch(`/api/sessions/${params.id}/labels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ speakerLabels }),
    })
  }

  const getSpeakerName = (speakerNum: number) => {
    return speakerLabels[speakerNum] || `Speaker ${speakerNum}`
  }

  const exportToWord = async () => {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import("docx")
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
            ...transcript?.utterances.map((utt) =>
              new Paragraph({
                children: [
                  new TextRun({ text: `${getSpeakerName(utt.speaker)}: `, bold: true }),
                  new TextRun(utt.transcript),
                ],
              })
            ) || [],
            new Paragraph({ text: "" }),
            new Paragraph({
              text: "AI Feedback",
              heading: HeadingLevel.HEADING_2,
            }),
            new Paragraph({ text: feedback }),
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
        {!labelsConfirmed && transcript?.utterances && transcript.utterances.length > 0 && (
          <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-900/20">
            <h3 className="mb-4 text-lg font-semibold text-blue-900 dark:text-blue-300">
              Identify Speakers
            </h3>
            <p className="mb-4 text-sm text-blue-700 dark:text-blue-400">
              Click to assign which speaker is the Counsellor and which is the Client:
            </p>
            <div className="flex gap-4">
              {Object.keys(speakerLabels).length === 0 ? (
                <>
                  <button
                    onClick={() => {
                      assignSpeakerLabel(0, "Counsellor")
                      assignSpeakerLabel(1, "Client")
                    }}
                    className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                  >
                    <User className="h-4 w-4" />
                    Speaker 0 = Counsellor, Speaker 1 = Client
                  </button>
                  <button
                    onClick={() => {
                      assignSpeakerLabel(0, "Client")
                      assignSpeakerLabel(1, "Counsellor")
                    }}
                    className="flex items-center gap-2 rounded-lg bg-slate-500 px-4 py-2 text-white hover:bg-slate-600"
                  >
                    <User className="h-4 w-4" />
                    Speaker 0 = Client, Speaker 1 = Counsellor
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-4">
                  <span className="text-sm">
                    Speaker 0: <strong>{speakerLabels[0] || "Not set"}</strong>
                  </span>
                  <span className="text-sm">
                    Speaker 1: <strong>{speakerLabels[1] || "Not set"}</strong>
                  </span>
                  {speakerLabels[0] && speakerLabels[1] && (
                    <button
                      onClick={confirmLabels}
                      className="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-white hover:bg-green-600"
                    >
                      <Check className="h-4 w-4" />
                      Confirm
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid h-[calc(100vh-16rem)] gap-6 lg:grid-cols-2">
          <div className="flex flex-col rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-4 dark:border-slate-700">
              <Mic className="h-5 w-5 text-blue-500" />
              <h2 className="font-semibold text-slate-900 dark:text-white">Transcript</h2>
            </div>
            <div className="flex-1 overflow-auto p-6">
              {!transcript?.utterances || transcript.utterances.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
                </div>
              ) : (
                <div className="space-y-4">
                  {transcript.utterances.map((utt, i) => (
                    <div
                      key={i}
                      className={`rounded-xl p-4 ${
                        getSpeakerName(utt.speaker) === "Counsellor"
                          ? "bg-blue-50 dark:bg-blue-900/20"
                          : "bg-slate-50 dark:bg-slate-700/50"
                      }`}
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span
                          className={`text-sm font-medium ${
                            getSpeakerName(utt.speaker) === "Counsellor"
                              ? "text-blue-900 dark:text-blue-300"
                              : "text-slate-900 dark:text-slate-300"
                          }`}
                        >
                          {getSpeakerName(utt.speaker)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300">{utt.transcript}</p>
                    </div>
                  ))}
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
              {feedbackLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                  Generating feedback...
                </div>
              ) : feedbackLoaded && !feedback ? (
                <div className="text-sm text-slate-500">Failed to generate feedback</div>
              ) : (
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  {feedback || "No feedback available"}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}