import { ReactRenderer } from "@tiptap/react"
import tippy, { Instance as TippyInstance } from "tippy.js"
import { MentionSuggestions } from "./MentionSuggestions"

export const mentionSuggestion = {
  items: async ({ query }: { query: string }) => {
    try {
      const [usersRes, groupsRes] = await Promise.all([
        fetch(`/api/users?q=${encodeURIComponent(query)}&excludeSelf=true`),
        fetch(`/api/groups?q=${encodeURIComponent(query)}`),
      ])

      const usersData = usersRes.ok ? await usersRes.json() : { users: [] }
      const groupsData = groupsRes.ok ? await groupsRes.json() : { groups: [] }

      const specialMentions = [
        { id: "channel", label: "channel", type: "group" as const },
        { id: "here", label: "here", type: "group" as const },
        { id: "everyone", label: "everyone", type: "group" as const },
      ].filter((m) => m.label.toLowerCase().includes(query.toLowerCase()))

      const usersList = (usersData.users || []).map((u: any) => ({
        id: u.id,
        label: u.username,
        handle: u.username,
        type: "user" as const,
      }))

      const groupsList = (groupsData.groups || []).map((g: any) => ({
        id: g.id,
        label: g.handle,
        handle: g.handle,
        type: "group" as const,
      }))

      return [...specialMentions, ...usersList, ...groupsList].slice(0, 10)
    } catch (err) {
      console.error("Error fetching mention suggestions:", err)
      return []
    }
  },

  render: () => {
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

        return component?.ref?.onKeyDown(props) ?? false
      },

      onExit() {
        popup?.[0]?.destroy()
        component?.destroy()
      },
    }
  },
}
