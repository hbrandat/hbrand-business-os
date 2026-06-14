import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { buildAgents, PIPELINE, type AgentStage } from '@/lib/agents'
import type { AssetType } from '@/lib/supabase'

export const maxDuration = 120

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key'
  )
}

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'

// Einzelnen Agenten aufrufen
async function runAgent(model: string, system: string, userContent: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY fehlt')

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: userContent }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Anthropic ${res.status}: ${err.slice(0, 200)}`)
  }
  const data = await res.json()
  return (data.content?.[0]?.text ?? '').trim()
}

export async function POST(req: NextRequest) {
  try {
    const { type, title, brief, customerId, orderId } = await req.json() as {
      type: AssetType; title: string; brief: string
      customerId?: string; orderId?: string
    }
    if (!type || !brief) {
      return NextResponse.json({ error: 'type und brief erforderlich' }, { status: 400 })
    }

    const supabase = getSupabase()

    // Kundendaten als Kontext laden (falls vorhanden)
    let customerContext = ''
    if (customerId) {
      const { data: c } = await supabase.from('customers').select('*').eq('id', customerId).single()
      if (c) {
        customerContext = `\n\nKUNDENDATEN:\n- Name: ${c.name}\n- Firma: ${c.company || '—'}\n- Branche/Notizen: ${c.notes || '—'}\n- Ort: ${[c.address, c.city, c.country].filter(Boolean).join(', ') || '—'}\n- E-Mail: ${c.email || '—'}\n- UID: ${c.vat_id || '—'}`
      }
    }

    const agents = buildAgents(type)
    const trace: { stage: AgentStage; model: string; preview: string }[] = []

    // ── Pipeline durchlaufen ──
    // Intake bekommt Roh-Brief + Kundendaten. Jede weitere Stufe bekommt den Output der vorigen.
    let intakeBriefing = ''
    let document = ''
    let salesMessage = ''

    for (const stage of PIPELINE) {
      const agent = agents[stage]
      let input = ''

      if (stage === 'intake') {
        input = `ANFRAGE:\n${brief}${customerContext}`
      } else if (stage === 'content') {
        input = `BRIEFING:\n${intakeBriefing}\n\nURSPRÜNGLICHE ANFRAGE:\n${brief}`
      } else if (stage === 'format') {
        input = `ENTWURF:\n${document}`
      } else if (stage === 'qualitaet') {
        input = `DOKUMENT:\n${document}`
      } else if (stage === 'sales') {
        input = `Das folgende Dokument (Typ: ${type}) geht an den Kunden. Schreibe die Begleitnachricht.\n\nDOKUMENT:\n${document}`
      }

      const output = await runAgent(agent.model, agent.system, input)
      trace.push({ stage, model: agent.model, preview: output.slice(0, 120) })

      if (stage === 'intake') intakeBriefing = output
      else if (stage === 'sales') salesMessage = output
      else document = output // content/format/qualitaet aktualisieren das Dokument
    }

    // ── Asset speichern (Status: in_review → Freigabe-Gate) ──
    const { data: asset, error } = await supabase.from('assets').insert({
      customer_id: customerId ?? null,
      order_id: orderId ?? null,
      type,
      title: title || `${type} (${new Date().toLocaleDateString('de-AT')})`,
      brief,
      content: document,
      format: 'markdown',
      status: 'in_review',
      version: 1,
      model: 'pipeline:haiku+sonnet',
      metadata: { sales_message: salesMessage, intake: intakeBriefing },
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Erste Version + Activity protokollieren
    await supabase.from('asset_versions').insert({
      asset_id: asset.id, version: 1, content: document, note: 'Erstgenerierung (5-Agenten-Pipeline)',
    })
    await supabase.from('activities').insert({
      entity_type: 'asset', entity_id: asset.id, customer_id: customerId ?? null,
      type: 'system', title: 'Asset generiert',
      description: `${type} · 5-Agenten-Pipeline · wartet auf Freigabe`,
    })

    return NextResponse.json({ asset, salesMessage, trace })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Fehler' }, { status: 500 })
  }
}
