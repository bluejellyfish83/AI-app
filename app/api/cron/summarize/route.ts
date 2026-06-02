export const runtime = 'edge'

import OpenAI from 'openai'
import { createServiceClient } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    const openrouter = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
    })

    const { chatId, content } = (await req.json()) as {
      chatId: string
      content: string
    }

    if (!chatId || !content) {
      return new Response(JSON.stringify({ error: 'chatId and content are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const supabase = createServiceClient()

    // 1. Save user message (blocking — must complete before we build context)
    const { error: userMsgError } = await supabase.from('messages').insert({
      chat_id: chatId,
      role: 'user',
      content,
    })

    if (userMsgError) {
      console.error('Failed to save user message:', userMsgError)
      return new Response(JSON.stringify({ error: 'Failed to save message' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 2. Fetch chat config
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('model_id, system_prompt, context_size')
      .eq('id', chatId)
      .single()

    if (chatError || !chat) {
      return new Response(JSON.stringify({ error: 'Chat not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 3. Fetch recent messages (includes the user message we just saved)
    const contextSize = chat.context_size ?? 8
    const { data: recentMessages, error: recentError } = await supabase
      .from('messages')
      .select('role, content')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false })
      .limit(contextSize)

    if (recentError) console.error('Failed to fetch recent messages:', recentError)

    const last8 = (recentMessages ?? []).reverse()

    // 4. Fetch summaries
    const { data: summaries } = await supabase
      .from('daily_summaries')
      .select('summary_date, summary')
      .eq('chat_id', chatId)
      .order('summary_date', { ascending: false })

    // 5. Build system prompt
    const now = new Date()
    const dateStr = now.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })

    let systemContent = chat.system_prompt || ''
    if (systemContent) systemContent += '\n\n'
    systemContent += `Current date and time: ${dateStr}`

    if (summaries && summaries.length > 0) {
      const summaryBlock = summaries
        .map((s) => `[${s.summary_date}] ${s.summary}`)
        .join('\n')
      systemContent += `\n\nHistorical context by date:\n${summaryBlock}`
    }

    // 6. Build messages array for the LLM
    // NOTE: last8 already contains the user message saved in step 1.
    // Do NOT append { role: 'user', content } again.
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemContent },
      ...last8.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ]

    // 7. Start LLM stream
    const stream = await openrouter.chat.completions.create({
      model: chat.model_id,
      messages,
      temperature: 0.7,
      stream: true,
    })

    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        let assistantContent = ''

        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? ''
            if (text) {
              assistantContent += text
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(text)}\n\n`))
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        } catch (err) {
          console.error('Stream error:', err)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify('[Error: streaming failed]')}\n\n`))
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        }

        // ───────────────────────────────────────────
        // CRITICAL: Await DB write BEFORE closing the stream.
        // On Vercel Edge, after controller.close() the isolate dies.
        // ───────────────────────────────────────────
        if (assistantContent) {
          try {
            const { error: msgError } = await supabase
              .from('messages')
              .insert({
                chat_id: chatId,
                role: 'assistant',
                content: assistantContent,
              })
            if (msgError) console.error('Failed to save assistant message:', msgError)

            const { error: chatUpdateError } = await supabase
              .from('chats')
              .update({ updated_at: new Date().toISOString() })
              .eq('id', chatId)
            if (chatUpdateError) console.error('Failed to update chat updated_at:', chatUpdateError)
          } catch (saveErr) {
            console.error('Error during assistant save:', saveErr)
          }
        }

        controller.close()
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    console.error('Chat API error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}