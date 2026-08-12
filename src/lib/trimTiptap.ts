// Utility to trim trailing empty blocks from a Tiptap document JSON
// Considers text with only whitespace/zero-width as empty, and treats
// inline nodes like mentions/images/links as non-empty.

const ZERO_WIDTH_REGEX = /[\u200B\uFEFF\s]+/g

const NON_EMPTY_INLINE = new Set(['mention', 'image', 'emoji', 'hardBreak', 'code_block', 'codeBlock', 'link', 'inlineCode'])

function hasNonEmptyContent(node: any): boolean {
  if (!node) return false

  if (node.type === 'text') {
    const stripped = (node.text || '').replace(ZERO_WIDTH_REGEX, '')
    return stripped.length > 0
  }

  if (NON_EMPTY_INLINE.has(node.type)) return true

  if (node.content && Array.isArray(node.content)) {
    for (const child of node.content) {
      if (hasNonEmptyContent(child)) return true
    }
    return false
  }

  return false
}

export function trimTrailingEmptyBlocks(doc: any) {
  if (!doc || !Array.isArray(doc.content)) return doc

  const content = [...doc.content]

  const trimList = (listNode: any) => {
    if (!listNode || !Array.isArray(listNode.content)) return null
    const newList = { ...listNode, content: [...listNode.content] }
    while (newList.content.length > 0) {
      const last = newList.content[newList.content.length - 1]
      if (!hasNonEmptyContent(last)) newList.content.pop()
      else break
    }
    return newList
  }

  while (content.length > 0) {
    const last = content[content.length - 1]

    if (!last) {
      content.pop()
      continue
    }

    if (last.type === 'bulletList' || last.type === 'orderedList') {
      const trimmed = trimList(last)
      if (!trimmed || trimmed.content.length === 0) {
        content.pop()
        continue
      }
      content[content.length - 1] = trimmed
      break
    }

    if (!hasNonEmptyContent(last)) {
      content.pop()
      continue
    }

    break
  }

  return { ...doc, content }
}

export default trimTrailingEmptyBlocks
