import { NextRequest, NextResponse } from 'next/server'
import { svc, callLLM, logAiJob } from '@/lib/engine'

export const maxDuration = 60

/**
 * POST /api/vera
 * VERA recherchiert Prospects via Gemini (Google Search) und legt sie in der DB an.
 * Body: { branche?, ort?, auftrag? }
 */
export async function POST(req: NextRequest) {
  const t0 = Date.now()
  try {
    const { branche = 'Handwerker', ort = 'Kärnten', auftrag } = await req.json()

    const prompt = auftrag || `Suche 5 konkrete ${branche}-Betriebe in ${ort}, Österreich.
Für jeden Betrieb liefere: Firmenname, Ansprechpartner (Inhaber/Geschäftsführer wenn findbar), Telefonnummer, E-Mail, Website, Ort.
Gib NUR real existierende Betriebe zurück die du über Google findest.
Format (pro Betrieb):
FIRMA: ...
ANSPRECHPARTNER: ...
TELEFON: ...
EMAIL: ...
WEBSITE: ...
ORT: ...
BRANCHE: ${branche}
---`

    const result = await callLLM(
      'gemini-2.5-flash',
      `Du bist VERA, die Sales-Agentin von hBrand.at aus Klagenfurt.
Du recherchierst potenzielle Neukunden für Alexander Hillebrand.
Zielgruppe: KMU in Kärnten (Installateure, Elektriker, Handwerker, Ordinationen).
Wichtig: Nur echte, verifizierte Betriebe. Keine erfundenen Daten.`,
      prompt,
      2048
    )

    await logAiJob({
      employee_key: 'vera', model: result.model,
      input_tokens: result.input_tokens, output_tokens: result.output_tokens,
      cost_usd: result.cost_usd, duration_ms: Date.now() - t0, status: 'completed',
      prompt_summary: `VERA Recherche: ${branche} in ${ort}`,
      result_summary: result.text.slice(0, 200),
    })

    // Prospects aus dem Text parsen
    const db = svc()
    const blocks = result.text.split(/---+/).filter(b => b.trim())
    const created: any[] = []

    for (const block of blocks) {
      const get = (key: string) => {
        const m = block.match(new RegExp(`${key}:\\s*(.+)`, 'i'))
        return m ? m[1].trim() : ''
      }
      const firma = get('FIRMA')
      if (!firma) continue

      const { data } = await db.from('prospects').insert({
        name:     get('ANSPRECHPARTNER') || firma,
        company:  firma,
        phone:    get('TELEFON'),
        email:    get('EMAIL'),
        website:  get('WEBSITE'),
        city:     get('ORT') || ort,
        industry: get('BRANCHE') || branche,
        source:   'vera',
        priority: 'mittel',
        status:   'neu',
      }).select().single()

      if (data) created.push(data)
    }

    return NextResponse.json({
      ok: true,
      found: created.length,
      raw: result.text,
      search_queries: result.search_queries ?? [],
      cost_usd: result.cost_usd,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
