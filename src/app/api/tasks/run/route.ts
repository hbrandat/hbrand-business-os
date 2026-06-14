import { NextRequest, NextResponse } from 'next/server'
import { svc, callLLM, logAiJob } from '@/lib/engine'

export const maxDuration = 120

// Lässt einen Mitarbeiter eine Aufgabe von seinem Tisch bearbeiten.
// Body: { taskId }
export async function POST(req: NextRequest) {
  const t0 = Date.now()
  try {
    const { taskId } = await req.json() as { taskId: string }
    if (!taskId) return NextResponse.json({ error: 'taskId fehlt' }, { status: 400 })

    const db = svc()

    // Aufgabe + zuständiger Mitarbeiter laden
    const { data: task, error: te } = await db
      .from('tasks').select('*').eq('id', taskId).single()
    if (te || !task) return NextResponse.json({ error: 'Aufgabe nicht gefunden' }, { status: 404 })

    const { data: emp, error: ee } = await db
      .from('employees').select('*').eq('id', task.assignee).single()
    if (ee || !emp) return NextResponse.json({ error: 'Kein Mitarbeiter zugewiesen' }, { status: 400 })

    // Status: arbeitet
    await db.from('tasks').update({ status: 'working', started_at: new Date().toISOString() }).eq('id', taskId)
    await db.from('employees').update({ status: 'working' }).eq('id', emp.id)

    // Kundenkontext (optional)
    let ctx = ''
    if (task.customer_id) {
      const { data: c } = await db.from('customers').select('*').eq('id', task.customer_id).single()
      if (c) ctx = `\n\nKUNDE:\n- Name: ${c.name}\n- Firma: ${c.company || '—'}\n- Notizen: ${c.notes || '—'}\n- Ort: ${[c.city, c.country].filter(Boolean).join(', ') || '—'}\n- E-Mail: ${c.email || '—'}`
    }

    const userContent = `AUFGABE: ${task.title}\n\nBESCHREIBUNG / INPUT:\n${task.brief || '(keine weitere Beschreibung)'}${ctx}\n\nBearbeite diese Aufgabe gemäß deiner Rolle. Liefere ein konkretes Ergebnis als Entwurf.`

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

    const durationMs = Date.now() - t0

    // Ergebnis speichern → wartet auf Chef (oder direkt done, wenn keine Freigabe nötig)
    const nextStatus = task.needs_approval ? 'needs_chef' : 'done'
    await db.from('tasks').update({
      result: result.text,
      status: nextStatus,
      finished_at: new Date().toISOString(),
      metadata: {
        ...(task.metadata || {}),
        model: result.model,
        input_tokens: result.input_tokens,
        output_tokens: result.output_tokens,
        cost_usd: result.cost_usd,
        duration_ms: durationMs,
      },
    }).eq('id', taskId)

    await db.from('employees').update({ status: 'idle' }).eq('id', emp.id)

    // Kosten protokollieren (Kostenkontrolle!)
    await logAiJob({
      employee_key: emp.key, customer_id: task.customer_id, order_id: task.order_id,
      model: result.model, input_tokens: result.input_tokens, output_tokens: result.output_tokens,
      cost_usd: result.cost_usd, duration_ms: durationMs, status: 'completed',
      prompt_summary: task.title, result_summary: result.text.slice(0, 300),
    })

    // Activity-Log
    await db.from('activities').insert({
      entity_type: 'order', entity_id: task.order_id ?? task.id, customer_id: task.customer_id ?? null,
      type: 'system', title: `${emp.name} hat „${task.title}" bearbeitet`,
      description: task.needs_approval ? 'Wartet auf deine Freigabe' : 'Erledigt',
    }).then(() => {}, () => {})

    return NextResponse.json({ ok: true, status: nextStatus, result: result.text, cost_usd: result.cost_usd })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Fehler' }, { status: 500 })
  }
}
