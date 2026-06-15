import { NextRequest, NextResponse } from 'next/server'
import { svc, callLLM, logAiJob } from '@/lib/engine'

export const maxDuration = 120

export async function POST(req: NextRequest) {
  const t0 = Date.now()
  try {
    const { taskId } = await req.json() as { taskId: string }
    if (!taskId) return NextResponse.json({ error: 'taskId fehlt' }, { status: 400 })

    const db = svc()

    const { data: task, error: te } = await db.from('tasks').select('*').eq('id', taskId).single()
    if (te || !task) return NextResponse.json({ error: 'Aufgabe nicht gefunden' }, { status: 404 })

    const { data: emp, error: ee } = await db.from('employees').select('*').eq('id', task.assignee).single()
    if (ee || !emp) return NextResponse.json({ error: 'Kein Mitarbeiter zugewiesen' }, { status: 400 })

    await db.from('tasks').update({ status: 'working', started_at: new Date().toISOString() }).eq('id', taskId)
    await db.from('employees').update({ status: 'working' }).eq('id', emp.id)

    let ctx = ''
    if (task.customer_id) {
      const { data: c } = await db.from('customers').select('*').eq('id', task.customer_id).single()
      if (c) ctx = `

KUNDE:
- Name: ${c.name}
- Firma: ${c.company || '—'}
- Notizen: ${c.notes || '—'}
- Ort: ${[c.city, c.country].filter(Boolean).join(', ') || '—'}
- E-Mail: ${c.email || '—'}`
    }

    let veraRule = ''
    if (emp.key === 'vera') {
      veraRule = `

⛔ VERA-PFLICHT:
1. Nutze IMMER dein Google Search Tool für alle Recherchen.
2. ABSOLUTES ERFINDUNGS-VERBOT: Wenn du keine echten Firmen findest, erfinde NIEMALS Daten! Schreibe dann nur "Keine realen Ergebnisse gefunden." und gib KEIN JSON aus.
3. Wenn du echte Leads findest, gib sie am Ende als JSON-Array in einem Codeblock aus (Keys: name, company, phone, email, website, city, industry, priority). Dieses JSON wird in die Akquise-Liste übertragen.`
    }

    const userContent = `AUFGABE: ${task.title}

BESCHREIBUNG / INPUT:
${task.brief || '(keine weitere Beschreibung)'}${ctx}${veraRule}

Bearbeite diese Aufgabe gemäß deiner Rolle. Liefere ein konkretes Ergebnis als Entwurf.`

    let result: Awaited<ReturnType<typeof callLLM>>
    try {
      result = await callLLM(emp.model || 'claude-sonnet-4', emp.system_prompt, userContent)
    } catch (err: any) {
      await db.from('tasks').update({
        status: 'failed', error: err.message, finished_at: new Date().toISOString(),
      }).eq('id', taskId)
      await db.from('employees').update({ status: 'idle' }).eq('id', emp.id)
      await logAiJob({
        employee_key: emp.key, customer_id: task.customer_id, order_id: task.order_id,
        model: emp.model, input_tokens: 0, output_tokens: 0, cost_usd: 0,
        duration_ms: Date.now() - t0, status: 'failed',
        prompt_summary: task.title, result_summary: err.message,
      })
      return NextResponse.json({ error: err.message }, { status: 500 })
    }

    let resultText = result.text;
    let metadataAdditions: any = {};

    if (emp.key === 'vera' && resultText.includes('```json')) {
      const jsonMatch = resultText.match(/```jsons*([s*{[sS]*?}s*])s*```/);
      if (jsonMatch) {
        try {
          const prospects = JSON.parse(jsonMatch[1]);
          let prospectsInserted = 0;
          if (Array.isArray(prospects)) {
            for (const p of prospects) {
              await db.from('prospects').insert({
                name: p.name || p.company || 'Unbekannt',
                company: p.company || null,
                phone: p.phone || null,
                email: p.email || null,
                website: p.website || null,
                city: p.city || 'Kärnten',
                industry: p.industry || null,
                priority: p.priority || 'mittel',
                source: 'vera',
                status: 'neu'
              });
              prospectsInserted++;
            }
          }
          resultText = resultText.replace(/```jsons*[s*{[sS]*?}s*]s*```/, '').trim();
          if (prospectsInserted > 0) {
            resultText += `

*(System-Notiz: ${prospectsInserted} Kontakt(e) wurden automatisch in die [Akquise-Liste](/dashboard/akquise) übertragen!)*`;
            metadataAdditions.prospects_inserted = prospectsInserted;
          }
        } catch (err) {
          console.error("Fehler beim Parsen der VERA Prospects (Task):", err);
        }
      }
    }

    const durationMs = Date.now() - t0;

    const nextStatus = task.needs_approval ? 'needs_chef' : 'done'
    await db.from('tasks').update({
      result: resultText,
      status: nextStatus,
      finished_at: new Date().toISOString(),
      metadata: {
        ...(task.metadata || {}),
        model: result.model,
        input_tokens: result.input_tokens,
        output_tokens: result.output_tokens,
        cost_usd: result.cost_usd,
        duration_ms: durationMs,
        ...metadataAdditions,
      },
    }).eq('id', taskId)

    await db.from('employees').update({ status: 'idle' }).eq('id', emp.id)

    await logAiJob({
      employee_key: emp.key, customer_id: task.customer_id, order_id: task.order_id,
      model: result.model, input_tokens: result.input_tokens, output_tokens: result.output_tokens,
      cost_usd: result.cost_usd, duration_ms: durationMs, status: 'completed',
      prompt_summary: task.title, result_summary: resultText.slice(0, 300),
    })

    await db.from('activities').insert({
      entity_type: 'order', entity_id: task.order_id ?? task.id, customer_id: task.customer_id ?? null,
      type: 'system', title: `${emp.name} hat „${task.title}" bearbeitet`,
      description: task.needs_approval ? 'Wartet auf deine Freigabe' : 'Erledigt',
    }).then(() => {}, () => {})

    return NextResponse.json({ ok: true, status: nextStatus, result: resultText, cost_usd: result.cost_usd })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Fehler' }, { status: 500 })
  }
}
