"use client"

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import Link from "next/link"
import { AudioLines, Plus, LogOut, User } from "lucide-react"

export default function Dashboard() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  if (status === "unauthenticated") {
    redirect("/login")
  }

  return (
    <div className="min-h-screen">
      <header className="border-b bg-white/80 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-semibold text-slate-900 dark:text-white">Counselor Training</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {session!.user.role.replace("_", " ")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600 dark:text-slate-300">{session!.user.email}</span>
            <Link
              href="/api/auth/signout"
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Past Sessions</h2>
            <p className="mt-1 text-slate-600 dark:text-slate-400">
              Review your previous counseling role-play sessions
            </p>
          </div>
          <Link
            href="/sessions/new"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-5 py-3 font-medium text-white shadow-lg transition-all hover:shadow-xl hover:scale-105"
          >
            <Plus className="h-5 w-5" />
            New Session
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-800">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700">
            <AudioLines className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-white">No sessions yet</h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Upload a role-play audio or record directly in browser to get started
          </p>
        </div>
      </main>
    </div>
  )
}