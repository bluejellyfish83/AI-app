export const runtime = 'nodejs'

import OpenAI from 'openai'
import { createServiceClient } from '@/lib/supabase'

const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
})

export async function POST(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createServiceClient()

  // Determine yesterday's date range (UTC)
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  const summaryDate = yesterday.toISOString().split('T')[0] // YYYY-MM-DD

  const startOfDay = `${summaryDate}T00:00:00.000Z`
  const endOfDay = `${summaryDate}T23:59:59.999Z`

  // Find distinct chat_ids that had messages yesterday
  const { data: messageRows, error: msgError } = await supabase
    .from('messages')
    .select('chat_id')
    .gte('created_at', startOfDay)
    .lte('created_at', endOfDay)

  if (msgError) {
    console.error('Error fetching messages:', msgError)
    return new Response(JSON.stringify({ error: 'Failed to fetch messages' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Get unique chat_ids
  const uniqueChatIds = [...new Set((messageRows ?? []).map((r) => r.chat_id))]

  if (uniqueChatIds.length === 0) {
    return Response.json({ success: true, processed: 0 })
  }

  let processed = 0

  for (const chatId of uniqueChatIds) {
    try {
      // Fetch yesterday's messages for this chat
      const { data: chatMessages } = await supabase
        .from('messages')
        .select('role, content')
        .eq('chat_id', chatId)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .order('created_at', { ascending: true })

      if (!chatMessages || chatMessages.length === 0) continue

      // Build transcript
      const transcript = chatMessages
        .map((m) => `${m.role}: ${m.content}`)
        .join('\n')

      // Call OpenRouter to summarize
      const completion = await openrouter.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Summarize the following conversation into 3-5 concise bullet points focusing on facts, decisions, and user preferences. Be brief.',
          },
          { role: 'user', content: transcript },
        ],
        temperature: 0.3,
        max_tokens: 200,
      })

      const summary = completion.choices[0]?.message?.content?.trim()
      if (!summary) continue

      // Upsert into daily_summaries
      const { error: upsertError } = await supabase
        .from('daily_summaries')
        .upsert(
          { chat_id: chatId, summary_date: summaryDate, summary },
          { onConflict: 'chat_id,summary_date' },
        )

      if (upsertError) {
        console.error(`Failed to upsert summary for chat ${chatId}:`, upsertError)
        continue
      }

      processed++
    } catch (err) {
      console.error(`Error processing chat ${chatId}:`, err)
      // Continue with next chat
    }
  }

  return Response.json({ success: true, processed })
}