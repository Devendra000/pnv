"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { X, Check, Monitor, Sun, Moon, Palette, User as UserIcon, Save } from "lucide-react"

interface UserSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

const THEME_MODES = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon }
]

const ACCENT_COLORS = [
  { id: 'default', color: '#6366f1', label: 'Indigo (Default)' },
  { id: 'emerald', color: '#10b981', label: 'Emerald' },
  { id: 'rose', color: '#f43f5e', label: 'Rose' },
  { id: 'amber', color: '#f59e0b', label: 'Amber' },
  { id: 'blue', color: '#3b82f6', label: 'Blue' },
  { id: 'violet', color: '#8b5cf6', label: 'Violet' },
]

export function UserSettingsModal({ isOpen, onClose }: UserSettingsModalProps) {
  const { data: session, update } = useSession()
  const user = session?.user as any
  const prefs = user?.preferences || {}
  
  const [activeTab, setActiveTab] = useState<'profile' | 'appearance'>('profile')
  
  // Theme State
  const [themeMode, setThemeMode] = useState<string>(prefs.themeMode || 'dark')
  const [accentColor, setAccentColor] = useState<string>(prefs.accentColor || '')
  
  // Profile State
  const [displayName, setDisplayName] = useState<string>(user?.displayName || '')
  const [username, setUsername] = useState<string>(user?.username || '')
  const [email, setEmail] = useState<string>(user?.email || '')
  const [bio, setBio] = useState<string>(user?.bio || '')
  const [avatarUrl, setAvatarUrl] = useState<string>(user?.avatarUrl || '')
  
  const [isSaving, setIsSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Sync initial state when modal opens
  useEffect(() => {
    if (isOpen) {
      setThemeMode(prefs.themeMode || 'dark')
      setAccentColor(prefs.accentColor || '')
      setDisplayName(user?.displayName || '')
      setUsername(user?.username || '')
      setEmail(user?.email || '')
      setBio(user?.bio || '')
      setAvatarUrl(user?.avatarUrl || '')
      setErrorMsg('')
    }
  }, [isOpen, user, prefs])

  // Live preview by updating HTML element styles directly (for theme)
  useEffect(() => {
    if (!isOpen || activeTab !== 'appearance') return

    const htmlEl = document.documentElement
    
    // Apply Mode
    htmlEl.classList.remove('light', 'dark')
    htmlEl.classList.add(themeMode)

    // Apply Accent
    if (accentColor && accentColor !== '#6366f1') {
      htmlEl.style.setProperty('--primary', accentColor)
      htmlEl.style.setProperty('--ring', accentColor)
    } else {
      htmlEl.style.removeProperty('--primary')
      htmlEl.style.removeProperty('--ring')
    }
  }, [themeMode, accentColor, isOpen, activeTab])

  const handleSave = async () => {
    setIsSaving(true)
    setErrorMsg('')
    try {
      if (activeTab === 'appearance') {
        const updatedPrefs = {
          themeMode,
          accentColor: accentColor === '#6366f1' ? null : accentColor
        }

        await fetch("/api/users/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedPrefs),
        })

        await update({ preferences: updatedPrefs })
      } else if (activeTab === 'profile') {
        const res = await fetch("/api/users/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ displayName, username, email, bio, avatarUrl }),
        })
        const data = await res.json()
        
        if (!res.ok) {
          throw new Error(data.error || "Failed to update profile")
        }

        await update({ displayName, username, email, bio, avatarUrl })
      }
      // Don't close immediately on success, maybe show a success toast? (For now, close is fine)
      onClose()
    } catch (err: any) {
      console.error("Failed to save settings:", err)
      setErrorMsg(err.message || 'An error occurred while saving')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (activeTab === 'appearance') {
      // Revert previews
      const htmlEl = document.documentElement
      const origMode = prefs.themeMode || 'dark'
      htmlEl.classList.remove('light', 'dark')
      htmlEl.classList.add(origMode)
      
      if (prefs.accentColor) {
        htmlEl.style.setProperty('--primary', prefs.accentColor)
        htmlEl.style.setProperty('--ring', prefs.accentColor)
      } else {
        htmlEl.style.removeProperty('--primary')
        htmlEl.style.removeProperty('--ring')
      }
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col sm:flex-row bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Sidebar */}
        <div className="w-full sm:w-64 flex-shrink-0 border-b sm:border-b-0 sm:border-r border-border bg-slate-50/50 dark:bg-slate-900/50 p-4">
          <div className="flex items-center justify-between sm:mb-6">
            <h2 className="text-lg font-bold text-foreground">Settings</h2>
            <button
              onClick={handleCancel}
              className="p-1.5 sm:hidden text-slate-400 hover:text-foreground rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex sm:flex-col gap-1 overflow-x-auto sm:overflow-visible pb-2 sm:pb-0">
            <button
              onClick={() => { setActiveTab('profile'); setErrorMsg('') }}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'profile'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-foreground'
              }`}
            >
              <UserIcon className="w-4 h-4" />
              My Profile
            </button>
            <button
              onClick={() => { setActiveTab('appearance'); setErrorMsg('') }}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'appearance'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-foreground'
              }`}
            >
              <Palette className="w-4 h-4" />
              Appearance
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto space-y-8">
              
              {activeTab === 'profile' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div>
                    <h3 className="text-xl font-bold text-foreground">My Profile</h3>
                    <p className="text-sm text-muted-foreground mt-1">Update your personal information and bio.</p>
                  </div>
                  
                  {errorMsg && (
                    <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
                      {errorMsg}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-6">
                    {/* Avatar Display & Input */}
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 ring-4 ring-background shadow-lg">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-slate-400">
                            {displayName?.charAt(0)?.toUpperCase() || username?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-1 space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-foreground">Profile Picture</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0]
                              if (!file) return
                              
                              const formData = new FormData()
                              formData.append("file", file)
                              formData.append("folder", "profiles")
                              
                              try {
                                const res = await fetch("/api/upload", {
                                  method: "POST",
                                  body: formData
                                })
                                const data = await res.json()
                                if (res.ok) {
                                  setAvatarUrl(data.url)
                                  
                                  // Auto-save avatar immediately
                                  await fetch("/api/users/profile", {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ displayName, username, email, bio, avatarUrl: data.url }),
                                  })
                                  await update({ avatarUrl: data.url })
                                } else {
                                  setErrorMsg(data.error || "Upload failed")
                                }
                              } catch (err) {
                                setErrorMsg("Upload failed")
                              }
                            }}
                            className="hidden"
                            id="avatar-upload"
                          />
                          <label 
                            htmlFor="avatar-upload"
                            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-sm font-medium rounded-lg cursor-pointer transition-colors shrink-0"
                          >
                            Upload File
                          </label>
                          <span className="text-xs text-muted-foreground">or URL:</span>
                          <input
                            type="url"
                            value={avatarUrl}
                            onChange={e => setAvatarUrl(e.target.value)}
                            placeholder="https://..."
                            className="flex-1 min-w-0 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-sm font-semibold text-foreground">Display Name</label>
                          <input
                            type="text"
                            value={displayName}
                            onChange={e => setDisplayName(e.target.value)}
                            placeholder="John Doe"
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-semibold text-foreground">Username</label>
                          <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-foreground">Email</label>
                        <input
                          type="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          disabled
                          className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/50 text-slate-500 border border-border rounded-lg text-sm cursor-not-allowed opacity-70"
                          title="Email cannot be changed currently"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-foreground">Bio</label>
                        <textarea
                          value={bio}
                          onChange={e => setBio(e.target.value)}
                          placeholder="Write a little bit about yourself..."
                          rows={3}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow resize-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'appearance' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div>
                    <h3 className="text-xl font-bold text-foreground">Appearance</h3>
                    <p className="text-sm text-muted-foreground mt-1">Customize how the app looks and feels for you.</p>
                  </div>
                  
                  {/* Theme Mode */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-foreground">Theme Mode</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-sm">
                      {THEME_MODES.map((mode) => (
                        <button
                          key={mode.id}
                          onClick={() => setThemeMode(mode.id)}
                          className={`flex items-center sm:flex-col sm:justify-center gap-3 p-3 sm:p-4 rounded-xl border-2 transition-all ${
                            themeMode === mode.id
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:border-primary/50 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                        >
                          <mode.icon className="w-5 h-5 flex-shrink-0" />
                          <span className="text-sm sm:text-xs font-medium">{mode.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Accent Color */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-foreground">Accent Color</label>
                    <div className="flex flex-wrap gap-4">
                      {ACCENT_COLORS.map((accent) => (
                        <button
                          key={accent.id}
                          onClick={() => setAccentColor(accent.color)}
                          className={`w-12 h-12 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-sm ${
                            (accentColor === accent.color) || (!accentColor && accent.id === 'default')
                              ? "ring-2 ring-offset-2 ring-offset-background ring-primary scale-110"
                              : "ring-1 ring-border ring-offset-1 ring-offset-background"
                          }`}
                          style={{ backgroundColor: accent.color }}
                          title={accent.label}
                        >
                          {((accentColor === accent.color) || (!accentColor && accent.id === 'default')) && (
                            <Check className="w-6 h-6 sm:w-5 sm:h-5 text-white drop-shadow-md" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border flex items-center justify-end gap-3 bg-card mt-auto shrink-0 hidden sm:flex">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg shadow-md shadow-primary/20 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>

          {/* Mobile Footer (sticky) */}
          <div className="sm:hidden p-4 border-t border-border flex items-center justify-end gap-3 bg-card shrink-0">
            <button
              onClick={handleCancel}
              className="flex-1 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white bg-primary rounded-lg transition-colors disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
