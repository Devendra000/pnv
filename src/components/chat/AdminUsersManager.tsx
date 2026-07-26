"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Users, UserPlus, Shield, Loader2, Check, Edit2, Trash2, UserCheck, X } from "lucide-react"

interface AdminUsersManagerProps {
  currentUserId?: string
}

export function AdminUsersManager({ currentUserId }: AdminUsersManagerProps) {
  const [users, setUsers] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)


  // Live username validation state
  const [usernameChecking, setUsernameChecking] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [usernameReason, setUsernameReason] = useState<string | null>(null)

  // Create Form State
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [role, setRole] = useState("USER")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Edit Modal State
  const [editingUser, setEditingUser] = useState<any | null>(null)
  const [editDisplayName, setEditDisplayName] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editPassword, setEditPassword] = useState("")
  const [editRole, setEditRole] = useState("USER")
  const [editSubmitting, setEditSubmitting] = useState(false)

  // Group Assignment Modal State
  const [groupAssignUser, setGroupAssignUser] = useState<any | null>(null)

  const fetchUsersAndGroups = async () => {
    setLoading(true)
    try {
      const [usersRes, groupsRes] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/groups"),
      ])
      if (usersRes.ok) {
        const data = await usersRes.json()
        setUsers(data.users || [])
      }
      if (groupsRes.ok) {
        const data = await groupsRes.json()
        setGroups(data.groups || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsersAndGroups()
  }, [])

  // Instant GitHub-style live username validation as user types
  useEffect(() => {
    const clean = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "")
    if (!clean) {
      setUsernameAvailable(null)
      setUsernameReason(null)
      return
    }

    setUsernameChecking(true)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/handles/check?handle=${clean}`)
        if (res.ok) {
          const data = await res.json()
          setUsernameAvailable(data.available)
          if (!data.available) {
            setUsernameReason(
              data.reason === "group"
                ? `Username @${clean} is already taken by User Group "${data.name}"`
                : `Username @${clean} is already taken by workspace user ${data.name}`
            )
          } else {
            setUsernameReason(null)
          }
        }
      } catch (err) {
        console.error(err)
      } finally {
        setUsernameChecking(false)
      }
    }, 50)

    return () => clearTimeout(timer)
  }, [username])

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (usernameAvailable === false) return

    setError("")
    setSuccess("")
    setSubmitting(true)

    try {
      const res = await fetch("/api/users/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          password,
          displayName: displayName.trim() || undefined,
          role,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to create user")
      } else {
        setSuccess(`User @${data.user.username} created successfully!`)
        setUsername("")
        setEmail("")
        setPassword("")
        setDisplayName("")
        setRole("USER")
        setUsernameAvailable(null)
        fetchUsersAndGroups()
      }
    } catch (err) {
      setError("An error occurred while creating user")
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenEdit = (user: any) => {
    setEditingUser(user)
    setEditDisplayName(user.displayName || "")
    setEditEmail(user.email || "")
    setEditPassword("")
    setEditRole(user.role || "USER")
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return
    setEditSubmitting(true)

    try {
      const res = await fetch(`/api/users/admin/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: editDisplayName.trim(),
          email: editEmail.trim(),
          role: editRole,
          password: editPassword.trim() || undefined,
        }),
      })

      if (res.ok) {
        setEditingUser(null)
        fetchUsersAndGroups()
      }
    } catch (err) {
      console.error("Failed to update user", err)
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleDeleteUser = async (user: any) => {
    if (!confirm(`Are you sure you want to delete user @${user.username}?`)) return

    try {
      const res = await fetch(`/api/users/admin/${user.id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        fetchUsersAndGroups()
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || "Failed to delete user")
      }
    } catch (err) {
      console.error("Failed to delete user", err)
    }
  }


  const handleToggleUserGroup = async (groupId: string, isMember: boolean) => {
    if (!groupAssignUser) return

    try {
      await fetch(`/api/groups/${groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: groupAssignUser.id,
          action: isMember ? "remove" : "add",
        }),
      })
      fetchUsersAndGroups()
    } catch (err) {
      console.error("Failed to toggle group membership", err)
    }
  }

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-slate-950 text-slate-100 select-none">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation Header Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3 text-white">
              <Shield className="w-7 h-7 text-amber-400" /> Admin Workspace Management
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Manage workspace users and user groups for team @mentions and communication.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
            <Link
              href="/admin/users"
              className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-2 shadow-sm"
            >
              <Users className="w-4 h-4" /> Manage Users
            </Link>
            <Link
              href="/admin/groups"
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all flex items-center gap-2"
            >
              <UserCheck className="w-4 h-4" /> User Groups
            </Link>
          </div>
        </div>

        {/* Create User Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-slate-200 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-indigo-400" /> Add New Workspace User
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

          <form onSubmit={handleCreateUser} autoComplete="off" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Fake inputs to prevent aggressive browser autofill */}
            <input type="text" name="fake_username_trap" style={{ display: "none" }} tabIndex={-1} autoComplete="off" />
            <input type="password" name="fake_password_trap" style={{ display: "none" }} tabIndex={-1} autoComplete="off" />

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. john_doe"
                required
                autoComplete="off"
                className={`w-full px-3.5 py-2 bg-slate-800 border rounded-xl text-sm text-slate-100 focus:ring-2 transition-all ${
                  usernameAvailable === false
                    ? "border-red-500 focus:ring-red-500"
                    : usernameAvailable === true
                    ? "border-emerald-500 focus:ring-emerald-500"
                    : "border-slate-700 focus:ring-indigo-500"
                }`}
              />

              {/* Instant GitHub-style live feedback below username input */}
              {usernameChecking ? (
                <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin text-indigo-400" /> Checking availability...
                </p>
              ) : usernameAvailable === true ? (
                <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-semibold">
                  <Check className="w-3.5 h-3.5" /> @{username.toLowerCase().trim()} is available
                </p>
              ) : usernameAvailable === false ? (
                <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1 font-semibold">
                  <X className="w-3.5 h-3.5" /> {usernameReason}
                </p>
              ) : null}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. john@company.com"
                required
                autoComplete="off"
                className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Initial password"
                required
                autoComplete="new-password"
                className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 focus:ring-2 focus:ring-indigo-500"
              />
            </div>


            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Display Name (Optional)
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            <div className="sm:col-span-2 flex justify-end pt-2">
              <button
                type="submit"
                disabled={submitting || usernameAvailable === false || usernameChecking}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/20"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Account
              </button>
            </div>
          </form>
        </div>

        {/* Existing Users Table with Hover Actions */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-base font-bold text-slate-200 flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-indigo-400" /> Active Team Members
          </h2>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-500">Loading users...</div>
          ) : (
            <div className="divide-y divide-slate-800">
              {users.map((u) => (
                <div key={u.id} className="py-3 px-3 rounded-xl hover:bg-slate-800/50 flex items-center justify-between transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-200 uppercase">
                      {u.username[0]}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-200 text-xs">
                        {u.displayName || u.username} <span className="text-slate-500">(@{u.username})</span>
                      </div>
                      <div className="text-[11px] text-slate-500">{u.email}</div>
                    </div>
                  </div>

                  {/* Actions on Hover */}
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      u.role === "ADMIN" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-slate-800 text-slate-400"
                    }`}>
                      {u.role}
                    </span>

                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 transition-opacity">
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600/30 hover:text-indigo-300 text-slate-400 border border-slate-700/80 transition-all text-xs flex items-center gap-1"
                        title="Edit User"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => setGroupAssignUser(u)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600/30 hover:text-indigo-300 text-slate-400 border border-slate-700/80 transition-all text-xs flex items-center gap-1"
                        title="Add to Group"
                      >
                        <UserCheck className="w-3.5 h-3.5" /> Add to Group
                      </button>
                      {u.id === currentUserId ? (
                        <span className="px-2 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg text-[10px] font-bold">
                          You
                        </span>
                      ) : (
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-600/30 hover:text-red-300 text-slate-400 border border-slate-700/80 transition-all text-xs flex items-center gap-1"
                          title="Delete User"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>


      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-400" /> Edit @{editingUser.username}
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  New Password (leave blank to keep current)
                </label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Role
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100"
                >
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-md"
                >
                  {editSubmitting && <Loader2 className="w-4 h-4 animate-spin" />} Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add User to Group Modal */}
      {groupAssignUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-indigo-400" /> Assign @{groupAssignUser.username} to Groups
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select which user groups @{groupAssignUser.username} should belong to.
                </p>
              </div>
              <button
                onClick={() => setGroupAssignUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {groups.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  No user groups exist yet. Create groups in <Link href="/admin/groups" className="text-indigo-400 underline">User Groups</Link>.
                </div>
              ) : (
                groups.map((g) => {
                  const isMember = g.members?.some(
                    (m: any) => (m.userId || m.user?.id) === groupAssignUser.id
                  )
                  return (
                    <label
                      key={g.id}
                      className="flex items-center justify-between p-3 bg-slate-800/60 border border-slate-700/80 rounded-xl cursor-pointer hover:bg-slate-800 transition-all text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-200">{g.name}</div>
                        <div className="text-[11px] text-indigo-400 font-mono">@{g.handle}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isMember}
                        onChange={() => handleToggleUserGroup(g.id, isMember)}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
                      />
                    </label>
                  )
                })
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setGroupAssignUser(null)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
