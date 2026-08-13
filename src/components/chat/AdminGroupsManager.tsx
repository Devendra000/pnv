"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  UserCheck,
  Plus,
  Shield,
  Loader2,
  Check,
  X,
  UserPlus,
  Trash2,
  Users,
  Edit2,
  Search,
  Sparkles,
  Layers,
} from "lucide-react"

export function AdminGroupsManager() {
  const [groups, setGroups] = useState<any[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Live handle validation state for creation
  const [handleChecking, setHandleChecking] = useState(false)
  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null)
  const [handleReason, setHandleReason] = useState<string | null>(null)

  // Edit Group Modal State
  const [editingGroup, setEditingGroup] = useState<any | null>(null)
  const [editName, setEditName] = useState("")
  const [editHandle, setEditHandle] = useState("")
  const [editHandleChecking, setEditHandleChecking] = useState(false)
  const [editHandleAvailable, setEditHandleAvailable] = useState<boolean | null>(null)
  const [editHandleReason, setEditHandleReason] = useState<string | null>(null)
  const [editSubmitting, setEditSubmitting] = useState(false)

  // Multi-select state per group for adding users
  const [selectedUsersToAdd, setSelectedUsersToAdd] = useState<Record<string, string[]>>({})
  // Multi-select state per group for removing users
  const [selectedMembersToRemove, setSelectedMembersToRemove] = useState<Record<string, string[]>>({})

  // Active modal group for multi-select user assignment
  const [activeGroupModal, setActiveGroupModal] = useState<any | null>(null)

  const [name, setName] = useState("")
  const [handle, setHandle] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const fetchGroups = async () => {
    setLoading(true)
    try {
      const [groupsRes, usersRes] = await Promise.all([
        fetch("/api/groups"),
        fetch("/api/users"),
      ])
      if (groupsRes.ok) {
        const data = await groupsRes.json()
        setGroups(data.groups || [])
      }
      if (usersRes.ok) {
        const data = await usersRes.json()
        setAllUsers(data.users || [])
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

  // Live handle availability check for creation form
  useEffect(() => {
    const clean = handle.trim().toLowerCase().replace(/[^a-z0-9]/g, "")
    if (!clean) {
      setHandleAvailable(null)
      setHandleReason(null)
      return
    }

    setHandleChecking(true)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/handles/check?handle=${clean}`)
        if (res.ok) {
          const data = await res.json()
          setHandleAvailable(data.available)
          if (!data.available) {
            setHandleReason(
              data.reason === "group"
                ? `Group handle @${clean} is already taken by "${data.name}"`
                : `Handle @${clean} is already taken by workspace user ${data.name}`
            )
          } else {
            setHandleReason(null)
          }
        }
      } catch (err) {
        console.error(err)
      } finally {
        setHandleChecking(false)
      }
    }, 50)

    return () => clearTimeout(timer)
  }, [handle])

  // Live handle availability check for edit modal
  useEffect(() => {
    if (!editingGroup) return
    const clean = editHandle.trim().toLowerCase().replace(/[^a-z0-9]/g, "")
    if (!clean || clean === editingGroup.handle) {
      setEditHandleAvailable(true)
      setEditHandleReason(null)
      return
    }

    setEditHandleChecking(true)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/handles/check?handle=${clean}`)
        if (res.ok) {
          const data = await res.json()
          setEditHandleAvailable(data.available)
          if (!data.available) {
            setEditHandleReason(
              data.reason === "group"
                ? `Handle @${clean} is taken by group "${data.name}"`
                : `Handle @${clean} is taken by user ${data.name}`
            )
          } else {
            setEditHandleReason(null)
          }
        }
      } catch (err) {
        console.error(err)
      } finally {
        setEditHandleChecking(false)
      }
    }, 50)

    return () => clearTimeout(timer)
  }, [editHandle, editingGroup])

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (handleAvailable === false) return

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
        setHandleAvailable(null)
        fetchGroups()
      }
    } catch (err) {
      setError("An error occurred while creating group")
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenEdit = (group: any) => {
    setEditingGroup(group)
    setEditName(group.name)
    setEditHandle(group.handle)
    setEditHandleAvailable(true)
    setEditHandleReason(null)
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingGroup || editHandleAvailable === false) return
    setEditSubmitting(true)

    try {
      const res = await fetch(`/api/groups/${editingGroup.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          handle: editHandle.trim().toLowerCase().replace(/[^a-z0-9]/g, ""),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || "Failed to update group")
      } else {
        setEditingGroup(null)
        fetchGroups()
      }
    } catch (err) {
      console.error("Failed to update group", err)
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleDeleteGroup = async (group: any) => {
    if (!confirm(`Are you sure you want to delete user group @${group.handle}? This will also remove its group discussion channel.`)) return

    try {
      const res = await fetch(`/api/groups/${group.id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        fetchGroups()
      } else {
        const data = await res.json()
        alert(data.error || "Failed to delete group")
      }
    } catch (err) {
      console.error("Failed to delete group", err)
    }
  }

  // Toggle user selection in multi-select add list
  const toggleUserToAdd = (groupId: string, userId: string) => {
    setSelectedUsersToAdd((prev) => {
      const current = prev[groupId] || []
      const next = current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId]
      return { ...prev, [groupId]: next }
    })
  }

  // Toggle member selection in batch remove list
  const toggleMemberToRemove = (groupId: string, userId: string) => {
    setSelectedMembersToRemove((prev) => {
      const current = prev[groupId] || []
      const next = current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId]
      return { ...prev, [groupId]: next }
    })
  }

  // Batch Add selected users to group
  const handleBatchAddMembers = async (groupId: string) => {
    const userIds = selectedUsersToAdd[groupId] || []
    if (userIds.length === 0) return

    try {
      await Promise.all(
        userIds.map((userId) =>
          fetch(`/api/groups/${groupId}/members`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, action: "add" }),
          })
        )
      )

      setSelectedUsersToAdd((prev) => ({ ...prev, [groupId]: [] }))
      fetchGroups()
    } catch (err) {
      console.error("Failed to add members", err)
    }
  }

  // Batch Remove selected users from group
  const handleBatchRemoveMembers = async (groupId: string) => {
    const userIds = selectedMembersToRemove[groupId] || []
    if (userIds.length === 0) return

    try {
      await Promise.all(
        userIds.map((userId) =>
          fetch(`/api/groups/${groupId}/members`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, action: "remove" }),
          })
        )
      )

      setSelectedMembersToRemove((prev) => ({ ...prev, [groupId]: [] }))
      fetchGroups()
    } catch (err) {
      console.error("Failed to remove members", err)
    }
  }

  // Remove single member
  const handleRemoveMember = async (groupId: string, userId: string) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "remove" }),
      })

      if (res.ok) {
        fetchGroups()
      }
    } catch (err) {
      console.error("Failed to remove member from group", err)
    }
  }

  const filteredGroups = groups.filter(
    (g) =>
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.handle.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-background text-foreground select-none">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Navigation Header Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3 text-white tracking-tight">
              <Shield className="w-7 h-7 text-amber-400 shrink-0" /> Admin User Groups
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Create and manage team groups for instant @mentions and private group discussion channels.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-card p-1.5 rounded-2xl border border-border shrink-0">
            <Link
              href="/admin/users"
              className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all flex items-center gap-2"
            >
              <Users className="w-4 h-4" /> Manage Users
            </Link>
            <Link
              href="/admin/groups"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500/20 to-indigo-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-2 shadow-lg shadow-amber-500/10"
            >
              <UserCheck className="w-4 h-4 text-amber-400" /> User Groups
            </Link>
          </div>
        </div>

        {/* Create Group Form Card */}
        <div className="bg-card/90 border border-border/90 rounded-2xl p-6 shadow-2xl space-y-5 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-border/80 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-primary" /> Create New User Group
            </h2>
            <span className="text-[11px] text-muted-foreground bg-muted/80 px-3 py-1 rounded-full border border-border/80 font-mono">
              Auto-creates @group channel
            </span>
          </div>

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

          <form onSubmit={handleCreateGroup} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Group Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Developers"
                required
                className="w-full px-4 py-2.5 bg-muted/80 border border-border/80 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Handle (for @mention)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-muted-foreground font-mono text-sm">@</span>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="e.g. devs"
                  required
                  className={`w-full pl-8 pr-4 py-2.5 bg-muted/80 border rounded-xl text-sm text-foreground font-mono placeholder:text-muted-foreground focus:ring-2 transition-all ${
                    handleAvailable === false
                      ? "border-red-500 focus:ring-red-500"
                      : handleAvailable === true
                      ? "border-emerald-500 focus:ring-emerald-500"
                      : "border-border/80 focus:ring-primary"
                  }`}
                />
              </div>

              {/* Instant GitHub-style live feedback */}
              {handleChecking ? (
                <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> Checking availability...
                </p>
              ) : handleAvailable === true ? (
                <p className="text-[11px] text-emerald-400 mt-1.5 flex items-center gap-1 font-semibold">
                  <Check className="w-3.5 h-3.5" /> @{handle.toLowerCase().replace(/[^a-z0-9]/g, "")} is available
                </p>
              ) : handleAvailable === false ? (
                <p className="text-[11px] text-red-400 mt-1.5 flex items-center gap-1 font-semibold">
                  <X className="w-3.5 h-3.5" /> {handleReason}
                </p>
              ) : null}
            </div>

            <div className="sm:col-span-2 flex justify-end pt-1">
              <button
                type="submit"
                disabled={submitting || handleAvailable === false || handleChecking}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-primary/20 transition-all"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create Group
              </button>
            </div>
          </form>
        </div>

        {/* Existing Groups Header & Search */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" /> Existing User Groups ({groups.length})
            </h2>

            {/* Search Bar */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search groups..."
                className="w-full pl-9 pr-4 py-2 bg-card/90 border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs text-muted-foreground bg-card/40 rounded-2xl border border-border">
              <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
              Loading workspace groups...
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="py-16 text-center text-xs text-muted-foreground bg-card/40 rounded-2xl border border-border">
              No user groups found.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {filteredGroups.map((g) => {
                const currentMemberUserIds = new Set(g.members?.map((m: any) => m.userId || m.user?.id) || [])
                const availableUsers = allUsers.filter((u) => !currentMemberUserIds.has(u.id))
                const selectedAddIds = selectedUsersToAdd[g.id] || []
                const selectedRemoveIds = selectedMembersToRemove[g.id] || []

                return (
                  <div
                    key={g.id}
                    className="bg-card border border-border/90 hover:border-border/80 rounded-2xl p-6 shadow-xl space-y-5 transition-all group"
                  >
                    {/* Card Header & Controls */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-primary/30 flex items-center justify-center font-bold text-primary font-mono text-base shadow-sm">
                          @
                        </div>
                        <div>
                          <div className="font-bold text-base text-white flex items-center gap-2">
                            {g.name}
                          </div>
                          <div className="text-xs text-primary font-mono font-semibold">
                            @{g.handle}
                          </div>
                        </div>
                      </div>

                      {/* Group Action Toolbar */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => handleOpenEdit(g)}
                          className="px-3 py-1.5 bg-muted hover:bg-primary/20 text-foreground hover:text-primary border border-border/80 hover:border-primary/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                          title="Edit Group Name or Handle"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => setActiveGroupModal(g)}
                          className="px-3.5 py-1.5 bg-primary/20 hover:bg-primary/40 text-primary border border-primary/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                        >
                          <UserPlus className="w-3.5 h-3.5" /> Add Users (Multi-select)
                        </button>
                        <button
                          onClick={() => handleDeleteGroup(g)}
                          className="px-3 py-1.5 bg-muted hover:bg-red-600/20 text-muted-foreground hover:text-red-300 border border-border/80 hover:border-red-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                          title="Delete Group"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                        <span className="text-xs font-bold text-foreground bg-muted/90 px-3 py-1.5 rounded-xl border border-border/80">
                          {g.members?.length || 0} members
                        </span>
                      </div>
                    </div>

                    {/* Member Grid */}
                    <div className="bg-background/60 border border-border/80 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                        <span>Group Members</span>
                        {selectedRemoveIds.length > 0 && (
                          <button
                            onClick={() => handleBatchRemoveMembers(g.id)}
                            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1.5 font-bold transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Remove Selected ({selectedRemoveIds.length})
                          </button>
                        )}
                      </div>

                      {g.members?.length === 0 ? (
                        <div className="text-xs text-muted-foreground italic py-2 text-center">
                          No members in this group yet. Click &quot;Add Users&quot; to assign team members.
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2.5">
                          {g.members?.map((m: any) => {
                            const uId = m.userId || m.user?.id
                            const isSelected = selectedRemoveIds.includes(uId)
                            const uName = m.user?.displayName || m.user?.username || "user"
                            const uHandle = m.user?.username || "user"

                            return (
                              <div
                                key={m.id || uId}
                                onClick={() => toggleMemberToRemove(g.id, uId)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs cursor-pointer border transition-all ${
                                  isSelected
                                    ? "bg-red-950/40 border-red-500/50 text-red-300 shadow-md"
                                    : "bg-muted/80 border-border/80 text-foreground hover:bg-muted hover:border-slate-600"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  className="w-3.5 h-3.5 rounded border-border bg-muted text-red-500 focus:ring-red-500"
                                />
                                <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center font-bold text-[10px] text-foreground uppercase">
                                  {uHandle[0]}
                                </div>
                                <span className="font-semibold">{uName}</span>
                                <span className="text-muted-foreground font-mono text-[11px]">(@{uHandle})</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleRemoveMember(g.id, uId)
                                  }}
                                  className="text-muted-foreground hover:text-red-400 transition-all p-0.5 ml-1 rounded hover:bg-accent"
                                  title="Remove member"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Edit Group Modal */}
      {editingGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-primary" /> Edit User Group @{editingGroup.handle}
              </h3>
              <button
                onClick={() => setEditingGroup(null)}
                className="p-1 rounded-lg text-muted-foreground hover:text-white hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                  Group Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 bg-muted border border-border rounded-xl text-xs text-foreground"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                  Handle (for @mention)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2 text-muted-foreground font-mono text-xs">@</span>
                  <input
                    type="text"
                    value={editHandle}
                    onChange={(e) => setEditHandle(e.target.value)}
                    required
                    className={`w-full pl-8 pr-4 py-2 bg-muted border rounded-xl text-xs font-mono text-foreground ${
                      editHandleAvailable === false
                        ? "border-red-500 focus:ring-red-500"
                        : editHandleAvailable === true
                        ? "border-emerald-500 focus:ring-emerald-500"
                        : "border-border focus:ring-primary"
                    }`}
                  />
                </div>

                {editHandleChecking ? (
                  <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin text-primary" /> Checking handle...
                  </p>
                ) : editHandleAvailable === false ? (
                  <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1 font-semibold">
                    <X className="w-3.5 h-3.5" /> {editHandleReason}
                  </p>
                ) : null}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingGroup(null)}
                  className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting || editHandleAvailable === false || editHandleChecking}
                  className="px-5 py-2 bg-primary hover:bg-primary disabled:opacity-40 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-md"
                >
                  {editSubmitting && <Loader2 className="w-4 h-4 animate-spin" />} Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Multi-Select Add Users Modal */}
      {activeGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-primary" /> Add Members to @{activeGroupModal.handle}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select multiple team members to assign to {activeGroupModal.name}.
                </p>
              </div>
              <button
                onClick={() => setActiveGroupModal(null)}
                className="p-1 rounded-lg text-muted-foreground hover:text-white hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto p-1">
              {(() => {
                const currentMemberUserIds = new Set(
                  activeGroupModal.members?.map((m: any) => m.userId || m.user?.id) || []
                )
                const availableUsers = allUsers.filter((u) => !currentMemberUserIds.has(u.id))
                const selectedIds = selectedUsersToAdd[activeGroupModal.id] || []

                if (availableUsers.length === 0) {
                  return (
                    <div className="p-6 text-center text-xs text-muted-foreground">
                      All workspace members are already in this group!
                    </div>
                  )
                }

                return availableUsers.map((u) => {
                  const isChecked = selectedIds.includes(u.id)
                  return (
                    <label
                      key={u.id}
                      onClick={() => toggleUserToAdd(activeGroupModal.id, u.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all text-xs ${
                        isChecked
                          ? "bg-indigo-950/40 border-primary/50 text-indigo-200"
                          : "bg-muted/60 border-border/80 text-foreground hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center font-bold text-[10px] text-foreground uppercase">
                          {u.username[0]}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">
                            {u.displayName || u.username} <span className="text-muted-foreground">(@{u.username})</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground">{u.email}</div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="w-4 h-4 rounded border-border bg-muted text-primary focus:ring-primary"
                      />
                    </label>
                  )
                })
              })()}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-border">
              <span className="text-xs text-muted-foreground font-semibold">
                {(selectedUsersToAdd[activeGroupModal.id] || []).length} user(s) selected
              </span>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setActiveGroupModal(null)}
                  className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleBatchAddMembers(activeGroupModal.id)
                    setActiveGroupModal(null)
                  }}
                  disabled={(selectedUsersToAdd[activeGroupModal.id] || []).length === 0}
                  className="px-5 py-2 bg-primary hover:bg-primary disabled:opacity-40 text-white font-bold rounded-xl text-xs shadow-md"
                >
                  Add Selected Members
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
