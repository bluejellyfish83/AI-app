'use client'

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import { MessageBubble, DateSeparator, formatDateLabel, type Message } from './message-bubble'
import { ChatEmptyState } from './chat-empty-state'

interface ChatMessagesProps {
  messages: Message[]
  isLoading?: boolean
  onSuggestionClick?: (text: string) => void
  onDeleteMessage?: (messageId: string) => void
  onBranchMessage?: (messageIndex: number) => void
  onRetryMessage?: () => void
}

export interface ChatMessagesHandle {
  scrollToLatestUser: () => void
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function scrollToLastUserBubble(
  container: HTMLDivElement,
  bubblesMap: Map<string, HTMLDivElement>,
  messages: Message[],
  behavior: ScrollBehavior = 'smooth',
) {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')
  const inner = container.firstElementChild as HTMLElement | null

  if (!lastUser || !inner) {
    container.scrollTo({ top: 0, behavior })
    return
  }

  const el = bubblesMap.get(lastUser.id)
  if (!el) return

  // 1. Strip previous padding and force a synchronous reflow so scrollHeight
  //    reflects true content height before any measurements.
  inner.style.paddingBottom = '0px'
  void container.offsetHeight // forces reflow

  // 2. getBoundingClientRect is always relative to the viewport — no
  //    offsetParent chain, no nesting ambiguity, unaffected by date separators.
  //    Adding container.scrollTop converts from viewport-relative to
  //    scroll-position-relative (absolute position inside the scroll container).
  const containerRect = container.getBoundingClientRect()
  const elRect = el.getBoundingClientRect()
  const targetScrollTop = Math.max(
    0,
    container.scrollTop + (elRect.top - containerRect.top) - 8,
  )

  // 3. Extend the scroll container's scrollable range so targetScrollTop
  //    is actually reachable (normally capped at scrollHeight - clientHeight).
  const requiredScrollHeight = targetScrollTop + container.clientHeight
  const deficit = requiredScrollHeight - container.scrollHeight
  if (deficit > 0) {
    inner.style.paddingBottom = `${deficit}px`
  }

  container.scrollTo({ top: targetScrollTop, behavior })
}

export const ChatMessages = forwardRef<ChatMessagesHandle, ChatMessagesProps>(
  function ChatMessages({ messages, isLoading = false, onSuggestionClick, onDeleteMessage, onBranchMessage, onRetryMessage }, ref) {
    const scrollRef = useRef<HTMLDivElement>(null)
    const bubbleRefs = useRef<Map<string, HTMLDivElement>>(new Map())
    // Track previous message count to detect new arrivals
    const prevCountRef = useRef(0)
    // Track the active conversation by hashing the first message id
    const convKeyRef = useRef<string | null>(null)

    useImperativeHandle(ref, () => ({
      scrollToLatestUser() {
        if (scrollRef.current) {
          scrollToLastUserBubble(scrollRef.current, bubbleRefs.current, messages)
        }
      },
    }))

    useEffect(() => {
      const container = scrollRef.current
      if (!container) return

      const prev = prevCountRef.current
      const curr = messages.length
      prevCountRef.current = curr

      if (curr === 0) {
        convKeyRef.current = null
        return
      }

      const convKey = messages[0].id
      const isNewConversation = convKey !== convKeyRef.current
      convKeyRef.current = convKey

      if (isNewConversation) {
        // Reset padding from previous conversation before measuring
        const inner = container.firstElementChild as HTMLElement | null
        if (inner) inner.style.paddingBottom = '0px'
        // Snap immediately (no animation) then re-apply padding
        requestAnimationFrame(() => {
          scrollToLastUserBubble(container, bubbleRefs.current, messages, 'instant')
        })
        return
      }

      if (curr > prev) {
        const newest = messages[curr - 1]
        // Only scroll when the new message is from the user.
        // AI responses arrive below the already-positioned user bubble — leave scroll alone.
        if (newest.role === 'user') {
          requestAnimationFrame(() => {
            scrollToLastUserBubble(container, bubbleRefs.current, messages, 'smooth')
          })
        }
      }
    }, [messages])

    if (messages.length === 0 && !isLoading) {
      return (
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto"
          role="log"
          aria-label="Chat messages"
          aria-live="polite"
        >
          <ChatEmptyState onSuggestionClick={onSuggestionClick ?? (() => {})} />
        </div>
      )
    }

    return (
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 pt-4 pb-2"
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
      >
        <div className="flex flex-col gap-1.5 w-full max-w-[1100px] mx-auto">
          {messages.map((message, i) => {
            const prev = messages[i - 1]
            const showDate = !prev || !isSameDay(prev.timestamp, message.timestamp)
            const isLastUserMessage = message.role === 'user' && i === messages.findLastIndex((m) => m.role === 'user')
            return (
              <div
                key={message.id}
                ref={(el) => {
                  if (el) bubbleRefs.current.set(message.id, el)
                  else bubbleRefs.current.delete(message.id)
                }}
              >
                {showDate && <DateSeparator label={formatDateLabel(message.timestamp)} />}
                <MessageBubble
                  message={message}
                  onDelete={onDeleteMessage ? () => onDeleteMessage(message.id) : undefined}
                  onBranch={onBranchMessage ? () => onBranchMessage(i) : undefined}
                  onRetry={isLastUserMessage ? onRetryMessage : undefined}
                />
              </div>
            )
          })}

          {/* Typing indicator */}
          {isLoading && (
            <div className="flex justify-start py-1" aria-label="AI is typing">
              <div className="flex gap-1.5 items-center h-4" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1 h-1 rounded-full bg-white/30 animate-bounce"
                    style={{ animationDelay: `${i * 120}ms`, animationDuration: '0.9s' }}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="h-px" aria-hidden="true" />
        </div>
      </div>
    )
  },
)
