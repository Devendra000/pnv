"use client"

import { useState, useRef, useEffect } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Mention from "@tiptap/extension-mention"
import Placeholder from "@tiptap/extension-placeholder"
import { Send, Loader2, AtSign, Hash } from "lucide-react"
import { createMentionSuggestion } from "./mentionSuggestion"
import { createCompanyMentionSuggestion } from "./companyMentionSuggestion"

interface MessageInputProps {
  channelId: string
  parentId?: string
  placeholder?: string
  onSent?: () => void
}

export function MessageInput({ channelId, parentId, placeholder = "Type a message... (Use @ to mention)", onSent }: MessageInputProps) {
  const [sending, setSending] = useState(false)
  const [hasContent, setHasContent] = useState(false)
  const handleSendRef = useRef<() => void>(() => {})

  const editor = useEditor({
    immediatelyRender: false,
    autofocus: "end",
    extensions: [
      StarterKit.configure({
        bulletList: false,
        orderedList: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
      Mention.configure({
        HTMLAttributes: {
          class: "mention font-semibold text-indigo-400 bg-indigo-500/20 px-1 py-0.5 rounded-md",
        },
        suggestion: createMentionSuggestion(channelId),
      }),
      Mention.extend({ name: 'companyMention' }).configure({
        HTMLAttributes: {
          class: "mention company-mention font-semibold text-emerald-400 bg-emerald-500/20 px-1 py-0.5 rounded-md",
        },
        suggestion: createCompanyMentionSuggestion(),
      }),
    ],

    onUpdate({ editor }) {
      setHasContent(!editor.isEmpty && !!editor.getText().trim())
    },
    editorProps: {
      handleKeyDown(view, event) {
        if (event.key === "Enter" && !event.shiftKey) {
          // If mention autocomplete popup is open, let mention extension handle Enter selection
          const isTippyVisible = document.querySelector(".tippy-box") !== null
          if (isTippyVisible) return false

          event.preventDefault()
          handleSendRef.current()
          return true
        }
        return false
      },
      attributes: {
        class:
          "focus:outline-none min-h-[44px] max-h-36 overflow-y-auto px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500",
      },
    },
  })

  // Auto-focus input cursor whenever switching to any channel, group, or DM
  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    const timer = setTimeout(() => {
      editor.commands.focus("end")
    }, 50)
    return () => clearTimeout(timer)
  }, [channelId, editor])


  const handleSend = async () => {
    if (!editor || sending) return
    const textContent = editor.getText().trim()
    if (!textContent) return

    const jsonContent = editor.getJSON()
    setSending(true)

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId,
          content: textContent,
          contentParsed: jsonContent,
          parentId: parentId || null,
        }),
      })

      if (res.ok) {
        editor.commands.clearContent()
        setHasContent(false)
        if (onSent) onSent()
      }
    } catch (err) {
      console.error("Failed to send message", err)
    } finally {
      setSending(false)
    }
  }

  useEffect(() => {
    handleSendRef.current = handleSend
  })

  return (
    <div className="p-4 bg-slate-900/60 border-t border-slate-800 shrink-0">
      <div className="relative bg-slate-800/80 border border-slate-700/80 rounded-2xl shadow-inner focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:border-indigo-500 transition-all flex items-end">
        <div className="flex-1 min-w-0">
          <EditorContent editor={editor} />
        </div>

        <div className="p-2 flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => editor?.commands.insertContent("@")}
            className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-400 hover:bg-slate-700/60 transition-all"
            title="Insert @mention"
          >
            <AtSign className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor?.commands.insertContent("#")}
            className="p-1.5 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-slate-700/60 transition-all"
            title="Insert #company"
          >
            <Hash className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !hasContent}
            className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-md shadow-indigo-600/20 transition-all"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
