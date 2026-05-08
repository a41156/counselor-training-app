"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Upload, Mic, ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"

export default function NewSessionPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [recording, setRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chunksRef = useRef<Blob[]>([])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) setFile(selected)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files?.[0]
    if (dropped && dropped.type.startsWith("audio/")) {
      setFile(dropped)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" })
        const audioFile = new File([blob], "recording.webm", { type: "audio/webm" })
        setFile(audioFile)
        stream.getTracks().forEach((t) => t.stop())
      }
      recorder.start()
      setMediaRecorder(recorder)
      setRecording(true)
    } catch {
      alert("Microphone access denied")
    }
  }

  const stopRecording = () => {
    mediaRecorder?.stop()
    setRecording(false)
  }

  const handleSubmit = async () => {
    if (!file) return
    setUploading(true)

    const formData = new FormData()
    formData.append("audio", file)

    const res = await fetch("/api/upload", { method: "POST", body: formData })
    const data = await res.json()

    router.push(`/sessions/${data.sessionId}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <header className="border-b bg-white/80 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/80">
        <div className="mx-auto max-w-2xl px-6 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">New Session</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Upload an audio file or record directly in browser
        </p>

        <div className="mt-8 space-y-6">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-colors ${
              dragOver
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-slate-300 hover:border-slate-400 dark:border-slate-600 dark:hover:border-slate-500"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <Upload className="mx-auto h-10 w-10 text-slate-400" />
            <p className="mt-4 font-medium text-slate-700 dark:text-slate-300">
              Drop audio file here or click to browse
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              MP3, WAV, M4A, WebM up to 25MB
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-slate-50 px-4 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                or record in browser
              </span>
            </div>
          </div>

          <button
            onClick={recording ? stopRecording : startRecording}
            className={`flex w-full items-center justify-center gap-3 rounded-xl px-4 py-4 font-medium transition-all ${
              recording
                ? "bg-red-500 text-white hover:bg-red-600"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <Mic className="h-5 w-5" />
            {recording ? "Stop Recording" : "Start Recording"}
          </button>

          {file && (
            <div className="rounded-xl bg-slate-100 p-4 dark:bg-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-300">{file.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  onClick={() => setFile(null)}
                  className="text-sm text-red-500 hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!file || uploading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 py-3 font-medium text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Uploading...
              </>
            ) : (
              "Upload & Process"
            )}
          </button>
        </div>
      </main>
    </div>
  )
}