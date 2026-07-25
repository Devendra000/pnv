export type ParsedMention =
  | { type: "USER"; userId: string }
  | { type: "CHANNEL" | "HERE" | "EVERYONE" }
  | { type: "GROUP"; groupId: string }

export function parseMentions(
  rawContent: string,
  userMap: Record<string, string>,  // username (lowercase) → userId
  groupMap: Record<string, string>  // handle (lowercase) → groupId
): ParsedMention[] {
  const mentions: ParsedMention[] = []
  const seen = new Set<string>()

  const regex = /@([a-zA-Z0-9_-]+)/g
  let match

  while ((match = regex.exec(rawContent)) !== null) {
    const handle = match[1].toLowerCase()

    if (seen.has(handle)) continue
    seen.add(handle)

    if (handle === "everyone") {
      mentions.push({ type: "EVERYONE" })
    } else if (handle === "channel") {
      mentions.push({ type: "CHANNEL" })
    } else if (handle === "here") {
      mentions.push({ type: "HERE" })
    } else if (userMap[handle]) {
      mentions.push({ type: "USER", userId: userMap[handle] })
    } else if (groupMap[handle]) {
      mentions.push({ type: "GROUP", groupId: groupMap[handle] })
    }
  }

  return mentions
}
