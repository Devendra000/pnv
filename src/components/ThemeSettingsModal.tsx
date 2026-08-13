"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { X, Check, Monitor, Sun, Moon, Palette } from "lucide-react"

interface ThemeSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

const THEME_MODES = [
  { id: 'system', label: 'System', icon: Monitor },
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

export function ThemeSettingsModal({ isOpen, onClose }: ThemeSettingsModalProps) {
  const { data: session, update } = useSession()
  const prefs = (session?.user as any)?.preferences || {}
  
  const [themeMode, setThemeMode] = useState<string>(prefs.themeMode || 'dark')
  const [accentColor, setAccentColor] = useState<string>(prefs.accentColor || '')
  
  const [isSaving, setIsSaving] = useState(false)

  // Sync initial state when modal opens
  useEffect(() => {
    if (isOpen) {
      setThemeMode(prefs.themeMode || 'dark')
      setAccentColor(prefs.accentColor || '')
    }
  }, [isOpen, prefs])

  // Live preview by updating HTML element styles directly
  useEffect(() => {
    if (!isOpen) return

    const htmlEl = document.documentElement
    
    // Apply Mode
    if (themeMode === 'system') {
      htmlEl.classList.remove('light', 'dark')
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      htmlEl.classList.add(systemDark ? 'dark' : 'light')
    } else {
      htmlEl.classList.remove('light', 'dark')
      htmlEl.classList.add(themeMode)
    }

    // Apply Accent
    if (accentColor && accentColor !== '#6366f1') {
      htmlEl.style.setProperty('--primary', accentColor)
      htmlEl.style.setProperty('--ring', accentColor)
    } else {
      htmlEl.style.removeProperty('--primary')
      htmlEl.style.removeProperty('--ring')
    }
  }, [themeMode, accentColor, isOpen])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const updatedPrefs = {
        themeMode,
        accentColor: accentColor === '#6366f1' ? null : accentColor
      }

      await fetch("/api/users/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPrefs),
      })

      // Update NextAuth session so it persists on next server load
      await update({ preferences: updatedPrefs })
      onClose()
    } catch (err) {
      console.error("Failed to save theme settings:", err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    // Revert previews
    const htmlEl = document.documentElement
    const origMode = prefs.themeMode || 'dark'
    htmlEl.classList.remove('light', 'dark')
    if (origMode !== 'system') htmlEl.classList.add(origMode)
    
    if (prefs.accentColor) {
      htmlEl.style.setProperty('--primary', prefs.accentColor)
      htmlEl.style.setProperty('--ring', prefs.accentColor)
    } else {
      htmlEl.style.removeProperty('--primary')
      htmlEl.style.removeProperty('--ring')
    }
    
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-slate-50/5 dark:bg-slate-900/20">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Appearance</h2>
          </div>
          <button
            onClick={handleCancel}
            className="p-1.5 text-slate-400 hover:text-foreground rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          
          {/* Theme Mode */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-foreground">Theme Mode</label>
            <div className="grid grid-cols-3 gap-3">
              {THEME_MODES.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setThemeMode(mode.id)}
                  className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    themeMode === mode.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <mode.icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{mode.label}</span>
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
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-sm ${
                    (accentColor === accent.color) || (!accentColor && accent.id === 'default')
                      ? "ring-2 ring-offset-2 ring-offset-background ring-primary scale-110"
                      : "ring-1 ring-border ring-offset-1 ring-offset-background"
                  }`}
                  style={{ backgroundColor: accent.color }}
                  title={accent.label}
                >
                  {((accentColor === accent.color) || (!accentColor && accent.id === 'default')) && (
                    <Check className="w-5 h-5 text-white drop-shadow-md" />
                  )}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex justify-end gap-3 bg-slate-50/5 dark:bg-slate-900/20">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg shadow-md shadow-primary/20 transition-colors disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Preferences"}
          </button>
        </div>

      </div>
    </div>
  )
}
