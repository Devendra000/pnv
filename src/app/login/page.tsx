"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { MessageSquare, Lock, User, AlertCircle, Loader2 } from "lucide-react"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) return

    setError("")
    setLoading(true)

    try {
      const res = await signIn("credentials", {
        username: username.trim(),
        password,
        redirect: false,
      })

      if (res?.error) {
        setError("Invalid username or password")
        setLoading(false)
      } else {
        router.push("/chat")
        router.refresh()
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 text-slate-100 p-4">
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-8 backdrop-blur-sm">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-4">
            <MessageSquare className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Welcome to PNV
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Sign in with your workspace credentials to continue
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 w-5 h-5 text-slate-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
                className="w-full pl-11 pr-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-5 h-5 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                className="w-full pl-11 pr-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center text-sm"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              "Sign In"
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
