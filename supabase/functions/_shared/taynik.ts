// AI text generation through the linked Taynik connector (OpenAI-compatible, via Lovable connector gateway).
export const TAYNIK_MODEL = 'orig/claude-sonnet-4-6'
const GATEWAY_URL = 'https://connector-gateway.lovable.dev/udc_taynik/v1/chat/completions'

export function taynikConfigured(): boolean {
  return Boolean(Deno.env.get('LOVABLE_API_KEY') && Deno.env.get('UDC_TAYNIK_API_KEY'))
}

export async function taynikComplete(systemPrompt: string, userMessage: string, maxTokens = 800): Promise<string | null> {
  const res = await fetch(GATEWAY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
      'X-Connection-Api-Key': Deno.env.get('UDC_TAYNIK_API_KEY') ?? '',
    },
    body: JSON.stringify({
      model: TAYNIK_MODEL,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    }),
  })
  if (!res.ok) {
    console.error(`Taynik API error: ${res.status} ${await res.text()}`)
    return null
  }
  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content
  return typeof text === 'string' ? text.trim() : null
}
