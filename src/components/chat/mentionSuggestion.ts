import { ReactRenderer } from "@tiptap/react"
import tippy, { Instance as TippyInstance } from "tippy.js"
import { MentionSuggestions } from "./MentionSuggestions"

const renderMentionPopup = () => {
  let component: ReactRenderer<any> | null = null
  let popup: TippyInstance[] | null = null

  return {
    onStart: (props: any) => {
      component = new ReactRenderer(MentionSuggestions, {
        props,
        editor: props.editor,
      })

      if (!props.clientRect) return

      popup = tippy("body", {
        getReferenceClientRect: props.clientRect,
        appendTo: () => document.body,
        content: component.element,
        showOnCreate: true,
        interactive: true,
        trigger: "manual",
        placement: "bottom-start",
      })
    },

    onUpdate(props: any) {
      component?.updateProps(props)

      if (!props.clientRect) return

      popup?.[0]?.setProps({
        getReferenceClientRect: props.clientRect,
      })
    },

    onKeyDown(props: any) {
      if (props.event.key === "Escape") {
        popup?.[0]?.hide()
        return true
      }

      return component?.ref?.onKeyDown(props) || false
    },

    onExit() {
      popup?.[0]?.destroy()
      component?.destroy()
    },
  }
}

export function createMentionSuggestion(channelId: string) {
  return {
    items: async ({ query }: { query: string }) => {
      try {
        const res = await fetch(
          `/api/mentions/suggestions?channelId=${encodeURIComponent(
            channelId || ""
          )}&q=${encodeURIComponent(query)}`
        )
        if (res.ok) {
          const data = await res.json()
          return data.suggestions || []
        }
        return []
      } catch (err) {
        console.error("Error fetching mention suggestions:", err)
        return []
      }
    },
    render: renderMentionPopup,
  }
}

export const mentionSuggestion = createMentionSuggestion("")
