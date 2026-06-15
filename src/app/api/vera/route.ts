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
      `Suche genau 5 ${branche}-Betriebe in ${ort}, Österreich über Google.
Gib die Ergebnisse EXAKT in diesem Format aus, einen Block pro Betrieb, getrennt durch ---:

FIRMA: [Firmenname]
ANSPRECHPARTNER: [Inhaber oder Geschäftsführer, falls bekannt, sonst leer lassen]
TELEFON: [Telefonnummer]
EMAIL: [E-Mail Adresse]
WEBSITE: [Website URL]
ORT: [Ort]
BRANCHE: ${branche}
---

Wichtig: Nur dieses exakte Format, keine zusätzlichen Erklärungen davor oder danach.`,
      2048
    )

    await logAiJob({
      employee_key: 'vera', model: result.model,
      input_tokens: result.input_tokens, output_tokens: result.output_tokens,
      cost_usd: result.cost_usd, duration_ms: Date.now() - t0, status: 'completed',
      prompt_summary: `VERA Recherche: ${branche} in ${ort}`,
      result_summary: result.text.slice(0, 200),
    })

    // Robusterer Parser — mehrere Formate unterstützen
    const db = svc()
    const created: any[] = []

    // Blöcke aufteilen (--- als Trenner)
    const blocks = result.text.split(/\n---+\n?/).filter(b => b.trim().length > 10)

    for (const block of blocks) {
      const get = (keys: string[]) => {
        for (const key of keys) {
          const m = block.match(new RegExp(`(?:^|\\n)\\s*\\*?\\*?${key}\\*?\\*?:?\\s*(.+)`, 'i'))
          if (m && m[1].trim() && m[1].trim() !== '—' && m[1].trim() !== '-') {
            return m[1].trim().replace(/^\*+|\*+$/g, '')
          }
        }
        return ''
      }

      const firma = get(['FIRMA', 'Firma', 'Firmenname', 'Name', 'Betrieb', 'Unternehmen'])
      if (!firma || firma.length < 2) continue

      const { data, error } = await db.from('prospects').insert({
        name:     get(['ANSPRECHPARTNER', 'Ansprechpartner', 'Inhaber', 'Geschäftsführer', 'Kontakt']) || firma,
        company:  firma,
        phone:    get(['TELEFON', 'Telefon', 'Tel', 'Phone']),
        email:    get(['EMAIL', 'E-Mail', 'Email', 'Mail']),
        website:  get(['WEBSITE', 'Website', 'Web', 'URL', 'Homepage']),
        city:     get(['ORT', 'Ort', 'Stadt', 'Standort']) || ort,
        industry: get(['BRANCHE', 'Branche']) || branche,
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
