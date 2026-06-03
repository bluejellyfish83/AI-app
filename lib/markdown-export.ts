/**
 * Import/Export conversations as Markdown (OpenRouter format).
 *
 * Format:
 * ```
 * # Title
 *
 * **User - --**
 *
 * message content
 *
 * **Assistant - --**
 *
 * response content
 * ```
 */

interface ParsedMessage {
  role: 'user' | 'ai'
  content: string
}

interface ParsedConversation {
  title: string
  messages: ParsedMessage[]
}

/**
 * Export a conversation to OpenRouter-style markdown.
 */
export function exportToMarkdown(title: string, messages: { role: 'user' | 'ai'; content: string }[]): string {
  const lines: string[] = [`# ${title}`, '']

  for (const msg of messages) {
    const roleLabel = msg.role === 'user' ? 'User' : 'Assistant'
    lines.push(`**${roleLabel} - --**`, '')
    lines.push(msg.content, '')
  }

  return lines.join('\n')
}

/**
 * Parse a markdown file into a conversation.
 * Supports:
 *   - **User - --** / **Assistant - --**
 *   - **Human - --** / **User - --**
 *   - ## Human / ## Assistant / ## User
 */
export function parseMarkdown(text: string): ParsedConversation {
  const lines = text.split('\n')

  // Extract title from first `# ` line
  let title = 'Imported Chat'
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
      title = trimmed.slice(2).trim()
      break
    }
  }

  // Split by role headers
  // Matches: **User - --**, **Assistant - --**, **Human - --**
  // Also matches: ## User, ## Assistant, ## Human
  const headerRegex = /^\s*(?:\*\*(User|Assistant|Human)\s*-\s*--\*\*|##\s*(User|Assistant|Human))\s*$/

  const messages: ParsedMessage[] = []
  let currentRole: 'user' | 'ai' | null = null
  let currentContent: string[] = []

  function flushMessage() {
    if (currentRole !== null) {
      const content = currentContent.join('\n').trim()
      if (content) {
        messages.push({ role: currentRole, content })
      }
    }
  }

  for (const line of lines) {
    const match = line.match(headerRegex)
    if (match) {
      // Flush previous message
      flushMessage()

      const roleStr = (match[1] || match[2]).toLowerCase()
      currentRole = roleStr === 'assistant' ? 'ai' : 'user'
      currentContent = []
    } else if (currentRole !== null) {
      currentContent.push(line)
    }
  }

  // Flush last message
  flushMessage()

  return { title, messages }
}