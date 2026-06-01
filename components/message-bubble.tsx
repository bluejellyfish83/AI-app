'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export type MessageRole = 'user' | 'ai'

export interface Message {
  id: string
  role: MessageRole
  content: string
  timestamp: Date
}

interface MessageBubbleProps {
  message: Message
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function formatDateLabel(date: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (msgDay.getTime() === today.getTime()) return 'Today'
  if (msgDay.getTime() === yesterday.getTime()) return 'Yesterday'

  return date.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })
}

export function DateSeparator({ label }: { label: string }) {
  return (
    <div className="flex justify-center my-1" aria-label={`Messages from ${label}`}>
      <span
        className="px-3 py-0.5 rounded-full text-[10px] tracking-wide text-white/42"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        {label}
      </span>
    </div>
  )
}

export function UserBubble({ message }: MessageBubbleProps) {
  return (
    <div className="w-full flex flex-col items-end gap-0.5">
      <div className="w-full flex justify-end">
        <div
          className="bubble-user px-3 py-1.5 rounded-[18px] rounded-br-sm
            leading-[1.5] text-white font-normal max-w-[72%] whitespace-pre-wrap break-words"
          style={{ fontSize: 'var(--chat-font-size, 11px)' }}
        >
          {message.content}
        </div>
      </div>
      <span className="text-[10px] text-white/38 pr-0.5 tabular-nums">
        {formatTime(message.timestamp)}
      </span>
    </div>
  )
}

export function AIBubble({ message }: MessageBubbleProps) {
  return (
    <div className="w-full text-left py-1">
      <div
        className="markdown-body"
        style={{ fontSize: 'var(--chat-font-size, 11px)' }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {message.content}
        </ReactMarkdown>
      </div>
    </div>
  )
}

export function MessageBubble({ message }: MessageBubbleProps) {
  if (message.role === 'user') return <UserBubble message={message} />
  return <AIBubble message={message} />
}
