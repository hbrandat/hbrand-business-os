import { NextRequest, NextResponse } from 'next/server'
import { svc, callLLM, logAiJob } from '@/lib/engine'

export const maxDuration = 60

// Eingehende Kundenanfrage (Website-Formular). Der Dispatcher wertet sie aus
// und legt dem Chef das Ergebnis auf den Tisch (Task an dispatcher → needs_chef).
// Body: { name?, email?, company?, message }
export async function POST(req: NextRequest) {
  const t0 = Date.now()
  try {
    const body = await req.json() as { name?: string; email?: string; company?: string; message: string; source?: string }
    if (!body.message) return NextResponse.json({ error: 'message erforderlich' }, { status: 400 })

    const db = svc()
    const { data: dispatcher } = await db.from('employees').select('*').eq('key', 'dispatcher').single()
    if (!dispatcher) return NextResponse.json({ error: 'Dispatcher nicht verfügbar' }, { status: 500 })

    const userContent = `NEUE ANFRAGE über ${body.source || 'Website'}:
Name: ${body.name || '(nicht angegeben)'}
E-Mail: ${body.email || '(nicht angegeben)'}
Firma: ${body.company || '(nicht angegeben)'}

NACHRICHT:
${body.message}

Werte diese Anfrage aus. Gib zurück:
- KATEGORIE: (Neukunde / laufendes Projekt / Support / Spam)
- WORUM GEHT ES: (1-2 Sätze)
- BEDARF: (was der Kunde konkret braucht)
- ZUSTÄNDIG: (welcher Mitarbeiter sollte das übernehmen)
- EMPFEHLUNG FÜR DEN CHEF: (nächster Schritt)`

    let analysis = ''
    let cost = 0
    try {
      const r = await callLLM(dispatcher.model, dispatcher.system_prompt, userContent, 1500)
      analysis = r.text; cost = r.cost_usd
      await logAiJob({
        employee_key: 'dispatcher', model: r.model,
        input_tokens: r.input_tokens, output_tokens: r.output_tokens, cost_usd: r.cost_usd,
        duration_ms: Date.now() - t0, status: 'completed',
        prompt_summary: `Anfrage: ${body.message.slice(0, 80)}`, result_summary: r.text.slice(0, 200),
      })
    } catch (err: any) {
      analysis = `(Automatische Auswertung fehlgeschlagen: ${err.message})\n\nOriginal-Anfrage:\n${body.message}`
    }

    // Aufgabe auf den Tisch des Dispatchers legen → wartet auf Chef
    const { data: task } = await db.from('tasks').insert({
      assignee: dispatcher.id,
      title: `Neue Anfrage: ${body.company || body.name || 'Unbekannt'}`,
      brief: `Von: ${body.name || '—'} (${body.email || 'keine E-Mail'})\nFirma: ${body.company || '—'}\n\n${body.message}`,
      result: analysis,
      status: 'needs_chef',
      priority: 'high',
      needs_approval: true,
      metadata: { source: body.source || 'website', contact: { name: body.name, email: body.email, company: body.company }, cost_usd: cost },
      finished_at: new Date().toISOString(),
    }).select().single()

    return NextResponse.json({ ok: true, taskId: task?.id, analysis })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Fehler' }, { status: 500 })
  }
}
