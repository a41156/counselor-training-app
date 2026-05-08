"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Mail, Lock, Globe } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    const result = await signIn("credentials", { email, password, redirect: false })
    if (result?.error) {
      setError("Invalid credentials")
      setLoading(false)
    } else {
      router.push("/")
    }
  }

  const handleGoogle = () => {
    signIn("google", { callbackUrl: "/" })
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 bg-gradient-to-br from-blue-600 to-indigo-700 lg:block">
        <div className="flex h-full flex-col justify-between p-12">
          <div>
            <h1 className="text-3xl font-bold text-white">Counselor Training</h1>
            <p className="mt-2 text-blue-100">AI-powered clinical training platform</p>
          </div>
          <div className="space-y-6">
            <h2 className="text-4xl font-bold text-white">Master your counseling skills</h2>
            <p className="text-lg text-blue-100">
              Upload role-play sessions and receive AI-generated feedback based on clinical
              theories like CBT, Person-Centered therapy, and more.
            </p>
          </div>
          <p className="text-sm text-blue-200">Built for counseling students and professionals</p>
        </div>
      </div>

      <div className="flex w-full items-center justify-center px-8 lg:w-1/2">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Welcome back</h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Sign in to continue to your dashboard
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
              {error}
            </div>
          )}

          <button
            onClick={handleGoogle}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Globe className="h-5 w-5" />
            Continue with Google
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-slate-50 px-4 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                or continue with email
              </span>
            </div>
          </div>

          <form onSubmit={handleCredentials} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Email
              </label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Password
              </label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 py-3 font-medium text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            New to the platform?{" "}
            <Link href="/register" className="font-medium text-blue-500 hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}