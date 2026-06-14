import { createClient } from '@supabase/supabase-js'

// Service-Client (serverseitig, voller Zugriff)
export function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key',
    { auth: { persistSession: false } }
  )
}

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'

// Modellpreise (USD pro 1M Token) — grob, für Kostenschätzung
const PRICING: Record<string, { in: number; out: number }> = {
  'claude-opus-4-8': { in: 15, out: 75 },
  'claude-sonnet-4': { in: 3, out: 15 },
  'claude-haiku-3-5': { in: 0.8, out: 4 },
}

export type LLMResult = {
  text: string
  input_tokens: number
  output_tokens: number
  cost_usd: number
  model: string
}

// Ruft Anthropic auf und gibt Text + Token/Kosten zurück
export async function callLLM(
  model: string,
  system: string,
  userContent: string,
  maxTokens = 4096
): Promise<LLMResult> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY fehlt am Server')

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userContent }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Anthropic ${res.status}: ${err.slice(0, 300)}`)
  }
  const data = await res.json()
  const text = (data.content?.[0]?.text ?? '').trim()
  const inTok = data.usage?.input_tokens ?? 0
  const outTok = data.usage?.output_tokens ?? 0
  const p = PRICING[model] ?? PRICING['claude-sonnet-4']
  const cost = (inTok / 1e6) * p.in + (outTok / 1e6) * p.out

  return { text, input_tokens: inTok, output_tokens: outTok, cost_usd: cost, model }
}

// Schickt eine Telegram-Nachricht an den Chef. Gibt {ok} zurück, wirft nie.
export async function sendTelegram(text: string): Promise<{ ok: boolean; error?: string }> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!botToken || !chatId) return { ok: false, error: 'Telegram nicht konfiguriert' }
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    })
    if (!res.ok) return { ok: false, error: (await res.text()).slice(0, 200) }
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

// Protokolliert einen KI-Job (Kostenkontrolle) + aggregiert in api_costs
export async function logAiJob(opts: {
  employee_key?: string
  customer_id?: string | null
  order_id?: string | null
  model: string
  input_tokens: number
  output_tokens: number
  cost_usd: number
  duration_ms?: number
  status?: 'completed' | 'failed'
  prompt_summary?: string
  result_summary?: string
}) {
  const db = svc()
  try {
    await db.from('ai_jobs').insert({
      customer_id: opts.customer_id ?? null,
      order_id: opts.order_id ?? null,
      task_type: opts.employee_key ? `employee:${opts.employee_key}` : 'document',
      model: opts.model,
      provider: 'anthropic',
      input_tokens: opts.input_tokens,
      output_tokens: opts.output_tokens,
      cost_usd: opts.cost_usd,
      duration_seconds: opts.duration_ms != null ? Math.round(opts.duration_ms / 1000) : null,
      status: opts.status === 'failed' ? 'failed' : 'done',
      result_summary: opts.result_summary?.slice(0, 500) ?? null,
    })

    // Monatsaggregat in api_costs (keine month-Spalte → pro Monat+Modell via created_at gruppiert)
    const monthStart = new Date()
    monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
    const { data: existing } = await db
      .from('api_costs')
      .select('id, total_input_tokens, total_output_tokens, total_cost_usd')
      .eq('model', opts.model)
      .gte('created_at', monthStart.toISOString())
      .maybeSingle()

    if (existing) {
      const newUsd = Number(existing.total_cost_usd ?? 0) + opts.cost_usd
      await db.from('api_costs').update({
        total_input_tokens: (existing.total_input_tokens ?? 0) + opts.input_tokens,
        total_output_tokens: (existing.total_output_tokens ?? 0) + opts.output_tokens,
        total_cost_usd: newUsd,
        total_cost_eur: newUsd * 0.92,
      }).eq('id', existing.id)
    } else {
      await db.from('api_costs').insert({
        provider: 'anthropic',
        model: opts.model,
        total_input_tokens: opts.input_tokens,
        total_output_tokens: opts.output_tokens,
        total_cost_usd: opts.cost_usd,
        total_cost_eur: opts.cost_usd * 0.92,
      })
    }
  } catch (e) {
    console.error('logAiJob failed', e)
  }
}
