"use client"

import React, { useState } from "react"
import Link from "next/link"
import { Users, Building, X } from "lucide-react"

interface RenderTiptapContentProps {
  content: any
  validMentionMap: Map<string, any>
}

// Recursively render Tiptap JSON nodes into React elements
const renderNode = (
  node: any, 
  index: number, 
  validMentionMap: Map<string, any>, 
  onImageClick?: (url: string) => void
): React.ReactNode => {
  // If text node
  if (node.type === "text") {
    let textElement: React.ReactNode = node.text

    if (typeof node.text === "string") {
      const urlRegex = /(https?:\/\/[^\s]+)/g
      const parts = node.text.split(urlRegex)
      if (parts.length > 1) {
        textElement = parts.map((part: string, i: number) => {
          if (part.match(/^https?:\/\//)) {
            return (
              <a 
                key={`link-${index}-${i}`} 
                href={part} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline break-all"
              >
                {part}
              </a>
            )
          }
          return part
        })
      }
    }

    if (node.marks) {
      node.marks.forEach((mark: any) => {
        if (mark.type === "bold") {
          textElement = <strong key={`bold-${index}`}>{textElement}</strong>
        } else if (mark.type === "italic") {
          textElement = <em key={`italic-${index}`}>{textElement}</em>
        } else if (mark.type === "strike") {
          textElement = <s key={`strike-${index}`}>{textElement}</s>
        } else if (mark.type === "code") {
          textElement = <code key={`code-${index}`} className="bg-muted text-primary px-1 py-0.5 rounded text-xs">{textElement}</code>
        } else if (mark.type === "link") {
          textElement = (
            <a 
              key={`mark-link-${index}`} 
              href={mark.attrs?.href} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline break-all"
            >
              {textElement}
            </a>
          )
        }
      })
    }
    return <React.Fragment key={index}>{textElement}</React.Fragment>
  }

  // If mention node (user, group, special)
  if (node.type === "mention") {
    const handle = node.attrs?.label?.toLowerCase()
    const mentionInfo = validMentionMap.get(handle)

    if (mentionInfo) {
      if (mentionInfo.type === "group") {
        const memberCount = mentionInfo.members?.length || 0
        const memberText = memberCount > 0 ? `${memberCount} member(s): ${mentionInfo.members?.join(", ")}` : "No members"
        return (
          <Link
            key={index}
            href={`/chat/group-${mentionInfo.handle}`}
            title={`Group @${mentionInfo.handle} • ${memberText}`}
            target="_blank"
            className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-md bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 font-semibold text-xs border border-amber-500/30 transition-all cursor-pointer shadow-sm no-underline"
          >
            <Users className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>@{node.attrs?.label}</span>
          </Link>
        )
      } else if (mentionInfo.type === "user") {
        return (
          <Link
            key={index}
            href={`/dm/${mentionInfo.username}`}
            target="_blank"
            className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-md bg-primary/20 text-primary hover:bg-primary/30 font-semibold text-xs border border-primary/30 transition-all cursor-pointer shadow-sm no-underline"
          >
            <span>@{node.attrs?.label}</span>
          </Link>
        )
      } else if (mentionInfo.type === "special") {
        return (
          <span
            key={index}
            className="px-1.5 py-0.5 mx-0.5 rounded-md bg-primary/20 text-primary font-semibold text-xs border border-primary/30 shadow-sm"
          >
            @{node.attrs?.label}
          </span>
        )
      }
    }
    // Fallback if not found in map
    return <span key={index} className="font-semibold text-primary">@{node.attrs?.label}</span>
  }

  // If company mention node
  if (node.type === "companyMention") {
    const handle = node.attrs?.label?.toLowerCase()
    const mentionInfo = validMentionMap.get(handle)

    // Use the ID from mentionInfo or fallback to node.attrs.id
    const companyId = mentionInfo?.id || node.attrs?.id

    return (
      <Link
        key={index}
        href={`/companies/${companyId}/view`}
        title={`Company #${node.attrs?.label}`}
        target="_blank"
        className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-md bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 font-semibold text-xs border border-emerald-500/30 transition-all cursor-pointer shadow-sm no-underline"
      >
        <Building className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span>#{node.attrs?.label}</span>
      </Link>
    )
  }

  // Structural nodes
  const children = node.content?.map((child: any, i: number) => renderNode(child, i, validMentionMap, onImageClick)) || null

  switch (node.type) {
    case "doc":
      return <div className="max-w-none leading-relaxed break-words text-foreground">{children}</div>
    case "paragraph":
      // Check if paragraph is empty
      if (!node.content || node.content.length === 0) {
        return <p key={index} className="my-1 min-h-[1rem]"><br /></p>
      }
      return <p key={index} className="my-1">{children}</p>
    case "heading":
      const level = node.attrs?.level || 1
      if (level === 1) return <h1 key={index} className="mt-4 mb-2 text-2xl font-bold tracking-tight text-foreground">{children}</h1>
      if (level === 2) return <h2 key={index} className="mt-4 mb-2 text-xl font-bold tracking-tight text-foreground">{children}</h2>
      if (level === 3) return <h3 key={index} className="mt-3 mb-1.5 text-lg font-semibold tracking-tight text-foreground">{children}</h3>
      return <h4 key={index} className="mt-3 mb-1.5 text-base font-semibold text-foreground">{children}</h4>
    case "bulletList":
      return <ul key={index} className="my-2 list-disc space-y-1 pl-6">{children}</ul>
    case "orderedList":
      return <ol key={index} className="my-2 list-decimal space-y-1 pl-6">{children}</ol>
    case "listItem":
      return <li key={index} className="pl-1">{children}</li>
    case "blockquote":
      return <blockquote key={index} className="border-l-4 border-primary/50 pl-4 py-1 italic text-muted-foreground bg-muted/30 rounded-r-lg my-2">{children}</blockquote>
    case "codeBlock":
      return (
        <pre key={index} className="bg-card border border-border rounded-lg p-3 my-2 overflow-x-auto text-xs text-foreground">
          <code>{children}</code>
        </pre>
      )
    case "hardBreak":
      return <br key={index} />
    case "image":
      return (
        <img
          key={index}
          src={node.attrs?.src}
          alt={node.attrs?.alt || "Image"}
          onClick={() => {
            if (onImageClick && node.attrs?.src) onImageClick(node.attrs.src)
          }}
          className="max-w-full max-h-[300px] object-contain rounded-lg border border-border/50 my-2 cursor-pointer transition-transform hover:scale-[1.02]"
        />
      )
    default:
      return <React.Fragment key={index}>{children}</React.Fragment>
  }
}

export function RenderTiptapContent({ content, validMentionMap }: RenderTiptapContentProps) {
  const [lightboxImg, setLightboxImg] = useState<string | null>(null)

  if (!content || content.type !== "doc") {
    return null
  }

  return (
    <>
      {renderNode(content, 0, validMentionMap, setLightboxImg)}
      
      {/* Lightbox Modal */}
      {lightboxImg && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200 p-4"
          onClick={() => setLightboxImg(null)}
        >
          <button 
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-black/50 hover:bg-black/70 rounded-full transition-colors"
            onClick={(e) => { e.stopPropagation(); setLightboxImg(null); }}
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={lightboxImg} 
            alt="Preview" 
            className="max-w-full max-h-[90vh] object-contain rounded-md shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()} // Prevent clicking image from closing modal
          />
        </div>
      )}
    </>
  )
}
