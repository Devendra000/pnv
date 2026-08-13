"use client"

import { useState } from "react"
import { X, Hash, Lock, Loader2 } from "lucide-react"

interface CreateChannelModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: (channel: any) => void
}

export function CreateChannelModal({ isOpen, onClose, onCreated }: CreateChannelModalProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isPrivate, setIsPrivate] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    setError("")

    const slug = name.toLowerCase().trim().replace(/[^a-z0-9]/g, "-")

    try {
      const res = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug,
          description: description.trim(),
          type: isPrivate ? "PRIVATE" : "PUBLIC",
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to create channel")
        setLoading(false)
      } else {
        setName("")
        setDescription("")
        setIsPrivate(false)
        setLoading(false)
        onCreated(data.channel)
        onClose()
      }
    } catch (err) {
      setError("An unexpected error occurred")
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden text-foreground">
        <div className="p-5 border-b border-border/80 flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Hash className="w-5 h-5 text-primary" /> Create a Channel
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-white hover:bg-muted transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Channel Name
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-muted-foreground font-mono text-sm">#</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. project-announcements"
                required
                className="w-full pl-8 pr-4 py-2 bg-muted/80 border border-border/80 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this channel about?"
              rows={3}
              className="w-full px-3.5 py-2 bg-muted/80 border border-border/80 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 bg-muted/40 border border-border rounded-xl">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="text-xs font-semibold text-foreground">Make Private</div>
                <div className="text-[11px] text-muted-foreground">Only invited members can join</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="w-4 h-4 rounded border-border bg-muted text-primary focus:ring-primary"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-white transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-primary disabled:opacity-50 text-white shadow-lg shadow-primary/20 flex items-center gap-2 transition-all"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Channel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
