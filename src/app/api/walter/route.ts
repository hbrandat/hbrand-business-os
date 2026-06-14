import { NextRequest, NextResponse } from 'next/server'
import { svc, callLLM, sendTelegram, logAiJob } from '@/lib/engine'

export const maxDuration = 120

// Walter, der Wächter. Scannt den Betrieb auf Probleme und alarmiert den Chef.
// Findet: gescheiterte Aufgaben (failed) + hängende Aufgaben (zu lange in 'working').
// Body (optional): { stuckMinutes?: number, silent?: boolean }
// Aufruf: per Cron (regelmäßig) oder manuell über den Button auf Walters Seite.
export async function POST(req: NextRequest) {
  const t0 = Date.now()
  try {
    const body = await req.json().catch(() => ({})) as { stuckMinutes?: number; silent?: boolean }
    const stuckMinutes = body.stuckMinutes ?? 15
    const db = svc()

    // Walter selbst laden (für Modell, Key, System-Prompt)
    const { data: walter } = await db.from('employees').select('*').eq('key', 'walter').single()

    const stuckCutoff = new Date(Date.now() - stuckMinutes * 60_000).toISOString()

    // 1) Gescheiterte Aufgaben (noch nicht quittiert via metadata.walter_seen)
    const { data: failed } = await db
      .from('tasks')
      .select('id, title, assignee, error, finished_at, metadata, employees(name)')
      .eq('status', 'failed')
      .order('finished_at', { ascending: false })
      .limit(50)

    // 2) Hängende Aufgaben: zu lange in 'working'
    const { data: stuck } = await db
      .from('tasks')
      .select('id, title, assignee, started_at, employees(name)')
      .eq('status', 'working')
      .lt('started_at', stuckCutoff)
      .limit(50)

    const newFailed = (failed || []).filter((t: any) => !t.metadata?.walter_seen)
    const stuckList = stuck || []
    const problemCount = newFailed.length + stuckList.length

    // Alles ruhig → Walter bleibt still
    if (problemCount === 0) {
      return NextResponse.json({ ok: true, problems: 0, message: 'Alles läuft sauber. Keine Vorfälle.' })
    }

    // Befund kompakt für Walters Analyse aufbereiten
    const lines: string[] = []
    if (newFailed.length) {
      lines.push('GESCHEITERTE AUFGABEN:')
      for (const t of newFailed as any[]) {
        lines.push(`- "${t.title}" (${t.employees?.name || t.assignee || '?'}): ${t.error || 'kein Fehlertext'}`)
      }
    }
    if (stuckList.length) {
      lines.push('\nHÄNGENDE AUFGABEN (zu lange in Arbeit):')
      for (const t of stuckList as any[]) {
        const mins = t.started_at ? Math.round((Date.now() - new Date(t.started_at).getTime()) / 60000) : '?'
        lines.push(`- "${t.title}" (${t.employees?.name || t.assignee || '?'}): seit ${mins} Min in Arbeit`)
      }
    }
    const befund = lines.join('\n')

    // Walter (KI) analysiert kurz und sachlich
    let analysis = befund
    let cost = 0
    if (walter) {
      try {
        const userContent = `Folgende Vorfälle wurden im Betrieb erkannt:\n\n${befund}\n\nFasse für den Chef kurz und sachlich zusammen: Was läuft wo schief, welche Ursache ist wahrscheinlich, und was ist zu tun? Maximal 6 Zeilen, keine Floskeln.`
        const r = await callLLM(walter.model || 'claude-sonnet-4', walter.system_prompt, userContent, 1024)
        analysis = r.text
        cost = r.cost_usd
        await logAiJob({
          employee_key: 'walter', model: r.model,
          input_tokens: r.input_tokens, output_tokens: r.output_tokens,
          cost_usd: r.cost_usd, duration_ms: Date.now() - t0, status: 'completed',
          prompt_summary: 'Wächter-Lauf', result_summary: r.text.slice(0, 300),
        })
      } catch (err: any) {
        analysis = `${befund}\n\n(Walter-Analyse fehlgeschlagen: ${err.message})`
      }
    }

    // Chef per Telegram alarmieren
    let telegram: { ok: boolean; error?: string } = { ok: false, error: 'übersprungen' }
    if (!body.silent) {
      const msg = `🔧 *Walter meldet ${problemCount} Vorfall/Vorfälle*\n\n${analysis}\n\n_HBrand.at · Wächter_`
      telegram = await sendTelegram(msg)
    }

    // Eintrag auf Walters Tisch, damit der Vorfall sichtbar bleibt
    if (walter) {
      await db.from('tasks').insert({
        assignee: walter.id,
        title: `Vorfall-Report: ${problemCount} Problem(e)`,
        brief: befund,
        result: analysis,
        priority: newFailed.length ? 'high' : 'normal',
        needs_approval: false,
        status: 'needs_chef',
        finished_at: new Date().toISOString(),
        metadata: { walter_report: true, problem_count: problemCount },
      }).then(() => {}, () => {})
    }

    // Gescheiterte Aufgaben als "von Walter gesehen" markieren (kein Doppel-Alarm)
    for (const t of newFailed as any[]) {
      await db.from('tasks').update({
        metadata: { ...(t.metadata || {}), walter_seen: true },
      }).eq('id', t.id).then(() => {}, () => {})
    }

    return NextResponse.json({
      ok: true,
      problems: problemCount,
      failed: newFailed.length,
      stuck: stuckList.length,
      analysis,
      telegram,
      cost_usd: cost,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Fehler' }, { status: 500 })
  }
}

// GET = bequemer Cron-Aufruf (gleiche Logik, Standardwerte)
export async function GET() {
  return POST(new NextRequest('http://local/api/walter', {
    method: 'POST', body: JSON.stringify({}),
  }))
}
