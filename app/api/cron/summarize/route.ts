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

    // a. Save user message
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

    // b. Fetch chat config
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

    // c. Fetch last N messages (desc), then reverse to chronological
    const contextSize = chat.context_size ?? 8
    const { data: recentMessages, error: recentError } = await supabase
      .from('messages')
      .select('role, content')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false })
      .limit(contextSize)

    if (recentError) {
      console.error('Failed to fetch recent messages:', recentError)
    }

    const last8 = (recentMessages ?? []).reverse()

    // d. Fetch daily summaries
    const { data: summaries } = await supabase
      .from('daily_summaries')
      .select('summary_date, summary')
      .eq('chat_id', chatId)
      .order('summary_date', { ascending: false })

    // e. Build system prompt with time + historical memory
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

    // f. Build messages array for the LLM
    // NOTE: last8 already includes the user message we just saved.
    // Do NOT append the user message again.
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemContent },
      ...last8.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ]

    // g. Call OpenRouter via OpenAI SDK, streaming
    const stream = await openrouter.chat.completions.create({
      model: chat.model_id,
      messages,
      temperature: 0.7,
      stream: true,
    })

    // h. Return SSE ReadableStream
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
        } finally {
          // Close the stream to the client first
          controller.close()
        }

        // i. Persist assistant message AFTER the stream is closed.
        // We await this so the Edge runtime stays alive until the write completes.
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