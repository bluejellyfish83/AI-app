export const runtime = 'edge'

export async function GET() {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { Accept: 'application/json' },
    })

    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch models from OpenRouter' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const json = await res.json()
    const raw = json.data ?? []

    // Map to our shape, filtering out junk entries
    const models = raw
      .filter((m: Record<string, unknown>) => m.id && m.name)
      .map((m: Record<string, unknown>) => ({
        id: m.id as string,
        name: (m.name as string) ?? (m.id as string),
        provider: ((m.id as string).split('/')[0] ?? 'unknown') as string,
        contextK: Math.round(((m.context_length as number) ?? 4096) / 1024),
        description: (m.description as string) ?? undefined,
      }))
      .sort((a: { provider: string; name: string }, b: { provider: string; name: string }) => {
        if (a.provider !== b.provider) return a.provider.localeCompare(b.provider)
        return a.name.localeCompare(b.name)
      })

    return Response.json(models, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  } catch (err) {
    console.error('Error fetching OpenRouter models:', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}