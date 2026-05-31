# Glass AI — Liquid Glass Chat

A beautiful liquid-glass AI chat interface built with Next.js 16, React 19, Tailwind CSS v4, Supabase, and OpenRouter.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-61dafb)
![Tailwind](https://img.shields.io/badge/Tailwind-v4-38bdf8)
![Supabase](https://img.shields.io/badge/Supabase-v2-3fcf8e)
![OpenRouter](https://img.shields.io/badge/OpenRouter-API-7c3aed)

---

## Features

- **Multi-model chat** — 18+ models from Anthropic, OpenAI, Google, Meta, Mistral, DeepSeek, and xAI via OpenRouter
- **Streaming responses** — real-time typewriter effect via SSE (Server-Sent Events)
- **Persistent conversations** — all chats and messages stored in Supabase PostgreSQL
- **Daily memory system** — automatic daily summarization gives the model long-term context
- **Live model list** — refresh to pull the latest models from OpenRouter's API
- **Per-conversation settings** — custom system prompt and model per chat
- **Glassmorphism UI** — frosted glass panels, animated ambient orbs, dark theme

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS v4, shadcn/ui (Radix) |
| Fonts | Geist + Geist Mono |
| Icons | lucide-react |
| Database | Supabase (PostgreSQL) |
| AI Gateway | OpenRouter (OpenAI-compatible API) |
| Edge Runtime | Vercel Edge Functions |

---

## Project Structure

```
app/
  page.tsx                           — main client component (state, streaming, persistence)
  layout.tsx                         — fonts, metadata, html shell
  globals.css                        — Tailwind theme + custom glass classes
  api/
    chat/route.ts                    — Edge: SSE streaming chat endpoint
    models/route.ts                  — Edge: proxy OpenRouter /models (1hr cache)
    cron/summarize/route.ts          — Node.js: daily conversation summarization

components/
  ambient-orbs.tsx                   — animated background blobs
  chat-header.tsx                    — top bar: menu, editable title, settings
  chat-sidebar.tsx                   — slide-in conversation list
  chat-messages.tsx                  — scrollable message list, auto-scroll
  message-bubble.tsx                 — UserBubble + AIBubble renderers
  chat-input-bar.tsx                 — textarea, send button, scroll-to-latest
  model-picker.tsx                   — model dropdown grouped by provider
  settings-sheet.tsx                 — bottom sheet: prompt, model, font
  chat-empty-state.tsx               — empty state (ambient orbs show through)

lib/
  supabase.ts                        — browser + service client factories
  openrouter-models.ts               — model catalogue, live fetch, localStorage cache
  utils.ts                           — cn() Tailwind merge utility

supabase/
  schema.sql                         — database schema (run in Supabase SQL Editor)
```

---

## Getting Started

### 1. Clone and install

```bash
git clone <your-repo-url>
cd aiApp-project
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. Copy your project URL and API keys from **Settings → API**

### 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in your `.env.local`:

```env
# Supabase (Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# OpenRouter (https://openrouter.ai/keys)
OPENROUTER_API_KEY=sk-or-v1-...

# Cron secret (generate: openssl rand -hex 32)
CRON_SECRET=your-random-secret-here
```

> **Important**: The Supabase URL should be just `https://your-project-id.supabase.co` — do NOT include `/rest/v1/`.

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

| Variable | Where to get it | Required |
|----------|----------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → `anon` `public` | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` `secret` | Yes |
| `OPENROUTER_API_KEY` | [openrouter.ai/keys](https://openrouter.ai/keys) | Yes |
| `CRON_SECRET` | Generate with `openssl rand -hex 32` | For cron only |

---

## Database Schema

Three tables, all with RLS disabled (auth is client-side via localStorage `user_id`):

```
chats              — id, user_id, title, model_id, system_prompt, created_at, updated_at
messages           — id, chat_id (FK), role, content, created_at
daily_summaries    — id, chat_id (FK), summary_date, summary, created_at
```

Run `supabase/schema.sql` in the Supabase SQL Editor to create these tables.

---

## Architecture

### Chat Flow

1. User types a message → optimistic UI update (message appears immediately)
2. `fetch('/api/chat', { chatId, content })` → Edge API route
3. API saves user message to Supabase, fetches last 8 messages + daily summaries
4. Builds system prompt with user's custom prompt + current date/time + historical memory
5. Calls OpenRouter with streaming via OpenAI SDK
6. Returns SSE stream → frontend reads chunks and appends to AI message (typewriter effect)
7. After stream ends, API saves full assistant message to Supabase in background

### Memory System

- **Short-term**: Last 8 messages sent with each request
- **Long-term**: Daily summaries stored in `daily_summaries` table, prepended to system prompt
- Summaries are generated by a cron job (`/api/cron/summarize`) that processes yesterday's conversations
- Uses `openai/gpt-4o-mini` for summarization (cheap, max 200 tokens per summary)

### User Identity

- Each user gets a random UUID stored in `localStorage` under `liquid_user_id`
- No authentication system — just a persistent anonymous ID
- All chats are scoped to this user ID

---

## Daily Cron Setup (Optional)

The daily summarization cron is optional. The chat works fine without it — the model just won't have long-term memory from previous days.

### Vercel Cron

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/summarize",
      "schedule": "0 2 * * *"
    }
  ]
}
```

### Manual Trigger

```bash
curl -X POST https://your-domain.vercel.app/api/cron/summarize \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## Models

18 built-in models across 7 providers. Click the refresh button in the model picker to load the full live list from OpenRouter (500+ models). Cached in localStorage.

| Provider | Models |
|----------|--------|
| Anthropic | Claude Opus 4, Sonnet 4.5, Haiku 3.5 |
| OpenAI | GPT-4.1, GPT-4.1 Mini, o3, o4-mini |
| Google | Gemini 2.5 Pro, Gemini 2.5 Flash |
| Meta | Llama 4 Maverick, Llama 4 Scout |
| Mistral | Mistral Large, Mistral Small 3.2 |
| DeepSeek | DeepSeek R2, DeepSeek Chat V3 |
| xAI | Grok 3, Grok 3 Mini |

Default: `anthropic/claude-sonnet-4-5`

---

## Key Data Types

```ts
// Frontend message (components/message-bubble.tsx)
interface Message {
  id: string
  role: 'user' | 'ai'    // note: DB stores 'assistant', mapped to 'ai' on read
  content: string
  timestamp: Date
}

// Frontend conversation (app/page.tsx)
interface Conversation {
  id: string
  title: string
  messages: Message[]
  updatedAt: Date
  systemPrompt: string
  modelId: string          // OpenRouter model ID
}
```

---

## Deployment

This project deploys on [Vercel](https://vercel.com):

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel project settings
4. Deploy

The API routes use Edge Runtime (`app/api/chat`, `app/api/models`) for low latency, and Node.js runtime (`app/api/cron/summarize`) for the cron job.