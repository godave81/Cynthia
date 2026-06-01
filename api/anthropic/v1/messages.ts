import type { VercelRequest, VercelResponse } from '@vercel/node'

// Increase timeout for Anthropic API calls.
// 300s requires Vercel Pro plan. Hobby plan hard-caps at 10s (will timeout for most generations).
export const config = { maxDuration: 300 }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY environment variable is not set' })
  }

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': (req.headers['anthropic-version'] as string) || '2023-06-01',
      },
      body: JSON.stringify(req.body),
    })

    const data = await upstream.json()
    return res.status(upstream.status).json(data)
  } catch (err) {
    return res.status(502).json({
      error: 'Failed to reach Anthropic API',
      detail: err instanceof Error ? err.message : String(err),
    })
  }
}
