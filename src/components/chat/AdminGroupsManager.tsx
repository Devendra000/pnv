"use client"

import { useState, useEffect } from "react"
import { UserCheck, Plus, Shield, Loader2, Check } from "lucide-react"

export function AdminGroupsManager() {
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [name, setName] = useState("")
  const [handle, setHandle] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const fetchGroups = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/groups")
      if (res.ok) {
        const data = await res.json()
        setGroups(data.groups || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGroups()
  }, [])

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setSubmitting(true)

    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          handle: handle.trim().toLowerCase().replace(/[^a-z0-9]/g, ""),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to create group")
      } else {
        setSuccess(`Group @${data.group.handle} created successfully!`)
        setName("")
        setHandle("")
        fetchGroups()
      }
    } catch (err) {
      setError("An error occurred while creating group")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-slate-950 text-slate-100">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3 text-white">
            <Shield className="w-7 h-7 text-amber-400" /> Admin User Groups
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Create group handles (e.g. @devs, @designers) to mention multiple team members at once.
          </p>
        </div>

        {/* Create Group Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-slate-200 flex items-center gap-2">
            <Plus className="w-5 h-5 text-indigo-400" /> Create New User Group
          </h2>

          {error && (
            <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4" /> {success}
            </div>
          )}

          <form onSubmit={handleCreateGroup} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Group Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Developers"
                required
                className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Handle (for @mention)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2 text-slate-500 font-mono text-sm">@</span>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="e.g. devs"
                  required
                  className="w-full pl-8 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="sm:col-span-2 flex justify-end pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/20"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Group
              </button>
            </div>
          </form>
        </div>

        {/* Existing Groups Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-base font-bold text-slate-200 flex items-center gap-2 mb-4">
            <UserCheck className="w-5 h-5 text-indigo-400" /> Existing User Groups
          </h2>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-500">Loading groups...</div>
          ) : groups.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">No user groups created yet.</div>
          ) : (
            <div className="divide-y divide-slate-800">
              {groups.map((g) => (
                <div key={g.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-200">{g.name}</div>
                    <div className="text-[11px] text-indigo-400 font-mono">@{g.handle}</div>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {g.members?.length || 0} members
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
