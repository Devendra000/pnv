"use client"

import { useState, useRef, useEffect } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Mention from "@tiptap/extension-mention"
import Placeholder from "@tiptap/extension-placeholder"
import { Send, Loader2, AtSign, Hash, Bold, Italic, Strikethrough, Code, List, ListOrdered, Quote, Heading1, Heading2, Heading3 } from "lucide-react"
import { createMentionSuggestion } from "./mentionSuggestion"
import { createCompanyMentionSuggestion } from "./companyMentionSuggestion"
import trimTrailingEmptyBlocks from '@/lib/trimTiptap'

const SEND_ON_ENTER = false

// Toolbar component for the rich text editor
const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) {
    return null
  }

  const ToolbarButton = ({ onClick, isActive, icon: Icon, title }: any) => (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={`p-1.5 rounded-lg transition-colors ${
        isActive
          ? "bg-indigo-500/30 text-indigo-300"
          : "text-slate-400 hover:bg-slate-700/60 hover:text-slate-200"
      }`}
      title={title}
    >
      <Icon className="w-4 h-4" />
    </button>
  )

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-800/90 border-b border-slate-700/80 rounded-t-2xl">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        icon={Bold}
        title="Bold (Cmd+B)"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        icon={Italic}
        title="Italic (Cmd+I)"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive("strike")}
        icon={Strikethrough}
        title="Strikethrough (Cmd+Shift+X)"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive("code")}
        icon={Code}
        title="Code (Cmd+E)"
      />
      
      <div className="w-[1px] h-4 bg-slate-700 mx-1" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive("heading", { level: 1 })}
        icon={Heading1}
        title="Heading 1 (Cmd+Alt+1)"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive("heading", { level: 2 })}
        icon={Heading2}
        title="Heading 2 (Cmd+Alt+2)"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive("heading", { level: 3 })}
        icon={Heading3}
        title="Heading 3 (Cmd+Alt+3)"
      />

      <div className="w-[1px] h-4 bg-slate-700 mx-1" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        icon={List}
        title="Bullet List (Cmd+Shift+8)"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
        icon={ListOrdered}
        title="Ordered List (Cmd+Shift+7)"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive("blockquote")}
        icon={Quote}
        title="Blockquote (Cmd+Shift+9)"
      />
    </div>
  )
}

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
  const editorRef = useRef<any>(null)

  const editor = useEditor({
    immediatelyRender: false,
    autofocus: "end",
    extensions: [
      StarterKit,
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
      handleKeyDown(view: any, event: KeyboardEvent): boolean {
        if (event.key === "Enter" && !event.shiftKey) {
          // If mention autocomplete popup is open, let mention extension handle Enter selection
          const isTippyVisible = document.querySelector(".tippy-box") !== null
          if (isTippyVisible) return false

          const isInsideListItem = () => {
            for (let depth = view.state.selection.$from.depth; depth > 0; depth -= 1) {
              if (view.state.selection.$from.node(depth).type.name === "listItem") {
                return true
              }
            }
            return false
          }

          const isEmptyListItem = () => {
            for (let depth = view.state.selection.$from.depth; depth > 0; depth -= 1) {
              const node = view.state.selection.$from.node(depth)
              if (node.type.name === "listItem") {
                return node.textContent.trim().length === 0
              }
            }
            return false
          }

          if (isInsideListItem()) {
            event.preventDefault()

            if (isEmptyListItem()) {
              return editorRef.current?.commands.liftListItem("listItem") ?? false
            }

            return editorRef.current?.commands.splitListItem("listItem") ?? false
          }

          if (!SEND_ON_ENTER) {
            return false
          }

          event.preventDefault()
            handleSendRef.current()
          return true
        }
        return false
      },
      attributes: {
        class:
          "focus:outline-none min-h-[44px] max-h-48 overflow-y-auto px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 prose prose-sm prose-invert max-w-none",
      },
    },
  })

  useEffect(() => {
    editorRef.current = editor
  }, [editor])

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
    // We can allow sending if there's no text but there's a file, but here we require text content or non-empty nodes.
    // If it's an empty paragraph, getText().trim() is empty. But if they insert an image later, it won't be empty.
    if (!textContent && editor.isEmpty) return

    const jsonContent = editor.getJSON()
    const cleanedContent = trimTrailingEmptyBlocks(jsonContent)
    setSending(true)

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId,
          content: textContent || " ",
          contentParsed: cleanedContent,
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
      <div className="relative bg-slate-800/80 border border-slate-700/80 rounded-2xl shadow-inner focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:border-indigo-500 transition-all flex flex-col">
        <MenuBar editor={editor} />
        
        <div className="flex items-end">
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
    </div>
  )
}
