'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { AmbientOrbs } from '@/components/ambient-orbs'
import { ChatHeader } from '@/components/chat-header'
import { ChatSidebar } from '@/components/chat-sidebar'
import { ChatMessages, type ChatMessagesHandle } from '@/components/chat-messages'
import { ChatInputBar } from '@/components/chat-input-bar'
import { SettingsSheet } from '@/components/settings-sheet'
import type { Message } from '@/components/message-bubble'
import { DEFAULT_MODEL_ID } from '@/lib/openrouter-models'
import { createBrowserClient } from '@/lib/supabase'

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  updatedAt: Date
  systemPrompt: string
  modelId: string
  contextSize: number
}

export interface GlobalDefaults {
  systemPrompt: string
  modelId: string
  contextSize: number
  fontFamily: 'mono' | 'sans'
  fontSize: 'sm' | 'md' | 'lg'
}

/** Get or create a persistent user ID in localStorage */
function getUserId(): string {
  if (typeof window === 'undefined') return ''
  const key = 'liquid_user_id'
  let uid = localStorage.getItem(key)
  if (!uid) {
    uid = crypto.randomUUID()
    localStorage.setItem(key, uid)
  }
  return uid
}

/** Map DB message role to frontend role */
function dbRoleToUI(role: string): 'user' | 'ai' {
  return role === 'assistant' ? 'ai' : 'user'
}

export default function ChatPage() {
  const [globalDefaults, setGlobalDefaults] = useState<GlobalDefaults>({
    systemPrompt: '',
    modelId: DEFAULT_MODEL_ID,
    contextSize: 8,
    fontFamily: 'mono',
    fontSize: 'md',
  })

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [globalSettingsOpen, setGlobalSettingsOpen] = useState(false)
  const [convSettingsOpen, setConvSettingsOpen] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  const messagesRef = useRef<ChatMessagesHandle>(null)
  const supabase = useRef(createBrowserClient()).current

  const active = conversations.find((c) => c.id === activeId) ?? conversations[0]

  // ── Initial load: fetch chats from Supabase ──────────────────────
  useEffect(() => {
    const userId = getUserId()
    if (!userId) return

    async function load() {
      const { data: chats, error } = await supabase
        .from('chats')
        .select('id, title, model_id, context_size, system_prompt, updated_at, created_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Failed to load chats:', error)
        // Create a default chat on error
        const defaultConv: Conversation = {
          id: crypto.randomUUID(),
          title: 'New Chat',
          messages: [],
          updatedAt: new Date(),
          systemPrompt: '',
          modelId: DEFAULT_MODEL_ID,
          contextSize: 8,
        }
        setConversations([defaultConv])
        setActiveId(defaultConv.id)
        setIsLoaded(true)
        return
      }

      if (!chats || chats.length === 0) {
        // No chats yet — create one in Supabase
        const { data: newChat, error: insertError } = await supabase
          .from('chats')
          .insert({
            user_id: userId,
            title: 'New Chat',
            model_id: DEFAULT_MODEL_ID,
            system_prompt: '',
          })
          .select('id, title, model_id, context_size, system_prompt, updated_at, created_at')
          .single()

        if (insertError || !newChat) {
          console.error('Failed to create default chat:', insertError)
          const fallbackConv: Conversation = {
            id: crypto.randomUUID(),
            title: 'New Chat',
            messages: [],
            updatedAt: new Date(),
            systemPrompt: '',
            modelId: DEFAULT_MODEL_ID,
            contextSize: 8,
          }
          setConversations([fallbackConv])
          setActiveId(fallbackConv.id)
          setIsLoaded(true)
          return
        }

        const conv: Conversation = {
          id: newChat.id,
          title: newChat.title ?? 'New Chat',
          messages: [],
          updatedAt: new Date(newChat.updated_at),
          systemPrompt: newChat.system_prompt ?? '',
          modelId: newChat.model_id ?? DEFAULT_MODEL_ID,
          contextSize: newChat.context_size ?? 8,
        }
        setConversations([conv])
        setActiveId(conv.id)
        setIsLoaded(true)
        return
      }

      // Map DB rows to frontend conversations (messages loaded on demand)
      const convs: Conversation[] = chats.map((c) => ({
        id: c.id,
        title: c.title ?? 'New Chat',
        messages: [], // loaded on demand
        updatedAt: new Date(c.updated_at),
        systemPrompt: c.system_prompt ?? '',
        modelId: c.model_id ?? DEFAULT_MODEL_ID,
        contextSize: c.context_size ?? 8,
      }))

      setConversations(convs)
      setActiveId(convs[0].id)

      // Eagerly load messages for the first chat
      if (convs[0]) {
        const { data: msgs } = await supabase
          .from('messages')
          .select('id, role, content, created_at')
          .eq('chat_id', convs[0].id)
          .order('created_at', { ascending: true })

        if (msgs && msgs.length > 0) {
          convs[0].messages = msgs.map((m) => ({
            id: m.id,
            role: dbRoleToUI(m.role),
            content: m.content,
            timestamp: new Date(m.created_at),
          }))
          setConversations([...convs])
        }
      }

      setIsLoaded(true)
    }

    load()
  }, [supabase])

  // ── Load messages when active chat changes ───────────────────────
  // Track which chats have had their messages loaded
  const loadedChatsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!activeId || !isLoaded) return
    if (loadedChatsRef.current.has(activeId)) return

    loadedChatsRef.current.add(activeId)

    async function loadMessages() {
      const { data: msgs } = await supabase
        .from('messages')
        .select('id, role, content, created_at')
        .eq('chat_id', activeId)
        .order('created_at', { ascending: true })

      if (msgs && msgs.length > 0) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeId
              ? {
                  ...c,
                  messages: msgs.map((m) => ({
                    id: m.id,
                    role: dbRoleToUI(m.role),
                    content: m.content,
                    timestamp: new Date(m.created_at),
                  })),
                }
              : c,
          ),
        )
      }
    }

    loadMessages()
  }, [activeId, isLoaded, supabase])

  const updateActive = useCallback(
    (updater: (c: Conversation) => Conversation) => {
      setConversations((prev) => prev.map((c) => (c.id === activeId ? updater(c) : c)))
    },
    [activeId],
  )

  const renameConversation = useCallback(
    (title: string) => {
      const trimmed = title.trim() || 'Untitled'
      updateActive((c) => ({ ...c, title: trimmed }))
      // Persist to Supabase
      supabase.from('chats').update({ title: trimmed }).eq('id', activeId).then(() => {})
    },
    [updateActive, activeId, supabase],
  )

  const handleNewConversation = useCallback(async () => {
    const userId = getUserId()
    const { data: newChat, error } = await supabase
      .from('chats')
      .insert({
        user_id: userId,
        title: 'New Chat',
        model_id: globalDefaults.modelId,
        context_size: globalDefaults.contextSize,
        system_prompt: globalDefaults.systemPrompt,
      })
      .select('id, title, model_id, context_size, system_prompt, updated_at, created_at')
      .single()

    if (error || !newChat) {
      console.error('Failed to create chat:', error)
      return
    }

    const conv: Conversation = {
      id: newChat.id,
      title: newChat.title ?? 'New Chat',
      messages: [],
      updatedAt: new Date(newChat.updated_at),
      systemPrompt: newChat.system_prompt ?? '',
      modelId: newChat.model_id ?? DEFAULT_MODEL_ID,
      contextSize: newChat.context_size ?? 8,
    }

    setConversations((prev) => [conv, ...prev])
    setActiveId(conv.id)
    setInput('')
    setSidebarOpen(false)
  }, [globalDefaults, supabase])

  const handleSelectConversation = useCallback(
    async (id: string) => {
      setActiveId(id)
      setInput('')
      setSidebarOpen(false)
    },
    [],
  )

  const sendMessage = useCallback(async () => {
    const text = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
    if (!text || isLoading || !active) return

    const isFirst = active.messages.length === 0
    const timestamp = new Date()

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp,
    }

    // Optimistically add user message + auto-title
    updateActive((c) => ({
      ...c,
      title: isFirst ? text.slice(0, 32) + (text.length > 32 ? '…' : '') : c.title,
      messages: [...c.messages, userMsg],
      updatedAt: timestamp,
    }))
    setInput('')
    setIsLoading(true)

    // Auto-title: update Supabase after first message
    if (isFirst) {
      const autoTitle = text.slice(0, 32) + (text.length > 32 ? '…' : '')
      supabase.from('chats').update({ title: autoTitle }).eq('id', active.id).then(() => {})
    }

    // Update chat updated_at in Supabase (also done server-side, but do it here too for sidebar ordering)
    supabase
      .from('chats')
      .update({ updated_at: timestamp.toISOString() })
      .eq('id', active.id)
      .then(() => {})

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: active.id, content: text }),
      })

      if (!res.ok) {
        throw new Error(`API returned ${res.status}`)
      }

      // Stream SSE response
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let aiContent = ''

      // Add placeholder AI message immediately
      const aiMsgId = crypto.randomUUID()
      const aiPlaceholder: Message = {
        id: aiMsgId,
        role: 'ai',
        content: '',
        timestamp: new Date(),
      }
      updateActive((c) => ({ ...c, messages: [...c.messages, aiPlaceholder] }))

      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Parse SSE lines
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? '' // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data: ')) continue
          const payload = trimmed.slice(6) // Remove "data: " prefix
          if (payload === '[DONE]') continue
          aiContent += payload
        }

        // Update the placeholder message content (typewriter effect)
        if (aiContent) {
          updateActive((c) => ({
            ...c,
            messages: c.messages.map((m) =>
              m.id === aiMsgId ? { ...m, content: aiContent } : m,
            ),
          }))
        }
      }

      // Process any remaining buffer
      const remaining = buffer.trim()
      if (remaining.startsWith('data: ') && !remaining.startsWith('data: [DONE]')) {
        aiContent += remaining.slice(6)
        if (aiContent) {
          updateActive((c) => ({
            ...c,
            messages: c.messages.map((m) =>
              m.id === aiMsgId ? { ...m, content: aiContent } : m,
            ),
          }))
        }
      }
    } catch (err) {
      console.error('Streaming error:', err)
      // Add error message as AI response
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        role: 'ai',
        content: 'Something went wrong. Please try again.',
        timestamp: new Date(),
      }
      updateActive((c) => ({ ...c, messages: [...c.messages, errorMsg] }))
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, active, updateActive, supabase])

  // Show loading state while initial data loads
  if (!isLoaded || !active) {
    return (
      <div className="relative flex flex-col h-[100dvh] overflow-hidden bg-[#030308]">
        <AmbientOrbs />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex gap-1.5 items-center h-4">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce"
                style={{ animationDelay: `${i * 120}ms`, animationDuration: '0.9s' }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex flex-col h-[100dvh] overflow-hidden bg-[#030308]">
      <AmbientOrbs />

      <ChatSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={conversations}
        activeId={activeId}
        onSelect={handleSelectConversation}
        onNew={handleNewConversation}
        onOpenGlobalSettings={() => {
          setSidebarOpen(false)
          setGlobalSettingsOpen(true)
        }}
      />

      <ChatHeader
        onMenuClick={() => setSidebarOpen(true)}
        title={active.title}
        onRename={renameConversation}
        onOpenConvSettings={() => setConvSettingsOpen(true)}
      />

      <main
        className={`relative z-10 flex flex-col flex-1 overflow-hidden ${globalDefaults.fontFamily === 'sans' ? 'font-sans' : 'font-mono'}`}
        style={{
          paddingTop: '48px',
          paddingBottom: '96px',
          '--chat-font-size': globalDefaults.fontSize === 'sm' ? '10px' : globalDefaults.fontSize === 'lg' ? '13px' : '11px',
        } as React.CSSProperties}
      >
        <ChatMessages
          ref={messagesRef}
          messages={active.messages}
          isLoading={isLoading}
          onSuggestionClick={(text) => {
            setInput(text)
          }}
        />
      </main>

      <div className="relative z-20">
        <ChatInputBar
          value={input}
          onChange={setInput}
          onSend={sendMessage}
          isLoading={isLoading}
          hasMessages={active.messages.length > 0}
          onScrollToLatest={() => messagesRef.current?.scrollToLatestUser()}
        />
      </div>

      {/* Global defaults settings */}
        <SettingsSheet
        isOpen={globalSettingsOpen}
        onClose={() => setGlobalSettingsOpen(false)}
        title="Default Settings (New Chats)"
        systemPrompt={globalDefaults.systemPrompt}
        onSystemPromptChange={(v) => setGlobalDefaults((d) => ({ ...d, systemPrompt: v }))}
        modelId={globalDefaults.modelId}
        onModelChange={(id) => setGlobalDefaults((d) => ({ ...d, modelId: id }))}
        contextSize={globalDefaults.contextSize}
        onContextSizeChange={(v) => setGlobalDefaults((d) => ({ ...d, contextSize: v }))}
        fontFamily={globalDefaults.fontFamily}
        onFontFamilyChange={(f) => setGlobalDefaults((d) => ({ ...d, fontFamily: f }))}
        fontSize={globalDefaults.fontSize}
        onFontSizeChange={(s) => setGlobalDefaults((d) => ({ ...d, fontSize: s }))}
      />

      {/* Per-conversation settings */}
      <SettingsSheet
        isOpen={convSettingsOpen}
        onClose={() => setConvSettingsOpen(false)}
        title={`Settings — ${active.title}`}
        systemPrompt={active.systemPrompt}
        onSystemPromptChange={(v) => {
          updateActive((c) => ({ ...c, systemPrompt: v }))
          supabase.from('chats').update({ system_prompt: v }).eq('id', active.id).then(() => {})
        }}
        modelId={active.modelId}
        onModelChange={(id) => {
          updateActive((c) => ({ ...c, modelId: id }))
          supabase.from('chats').update({ model_id: id }).eq('id', active.id).then(() => {})
        }}
        contextSize={active.contextSize}
        onContextSizeChange={(v) => {
          updateActive((c) => ({ ...c, contextSize: v }))
          supabase.from('chats').update({ context_size: v }).eq('id', active.id).then(() => {})
        }}
        fontFamily={globalDefaults.fontFamily}
        onFontFamilyChange={(f) => setGlobalDefaults((d) => ({ ...d, fontFamily: f }))}
        fontSize={globalDefaults.fontSize}
        onFontSizeChange={(s) => setGlobalDefaults((d) => ({ ...d, fontSize: s }))}
      />
    </div>
  )
}