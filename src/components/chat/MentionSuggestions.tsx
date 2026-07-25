"use client"

import React, { forwardRef, useEffect, useImperativeHandle, useState } from "react"
import { User, Users } from "lucide-react"

export interface MentionSuggestionsProps {
  items: Array<{
    id: string
    label: string
    type: "user" | "group"
    handle?: string
    memberCount?: number
  }>
  command: (item: { id: string; label: string }) => void
}

export const MentionSuggestions = forwardRef((props: MentionSuggestionsProps, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectItem = (index: number) => {
    const item = props.items[index]
    if (item) {
      props.command({ id: item.handle || item.label, label: item.label })
    }
  }

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length)
  }

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length)
  }

  const enterHandler = () => {
    selectItem(selectedIndex)
  }

  useEffect(() => {
    setSelectedIndex(0)
  }, [props.items])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === "ArrowUp") {
        upHandler()
        return true
      }
      if (event.key === "ArrowDown") {
        downHandler()
        return true
      }
      if (event.key === "Enter" || event.key === "Tab") {
        enterHandler()
        return true
      }
      return false
    },
  }))

  if (!props.items.length) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-2xl text-xs text-slate-500">
        No matching users or groups
      </div>
    )
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden min-w-[220px] max-h-60 overflow-y-auto p-1 text-slate-100 z-50">
      {props.items.map((item, index) => (
        <button
          key={item.id}
          onClick={() => selectItem(index)}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all text-left ${
            index === selectedIndex
              ? "bg-indigo-600/30 text-indigo-300 font-semibold border border-indigo-500/40"
              : "text-slate-300 hover:bg-slate-800/80"
          }`}
        >
          {item.type === "group" ? (
            <Users className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          ) : (
            <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          )}
          <span className="truncate flex-1">@{item.label}</span>
          {item.type === "group" && item.memberCount !== undefined && (
            <span className="text-[10px] text-slate-400 font-normal bg-slate-800/90 px-2 py-0.5 rounded-full border border-slate-700/60 shrink-0">
              {item.memberCount} {item.memberCount === 1 ? "member" : "members"}
            </span>
          )}
        </button>
      ))}
    </div>
  )
})

MentionSuggestions.displayName = "MentionSuggestions"
