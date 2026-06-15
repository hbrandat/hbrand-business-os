import { NextRequest, NextResponse } from 'next/server'
import { svc, callLLM, logAiJob } from '@/lib/engine'

export const maxDuration = 120

/**
 * POST /api/lukas
 * LUKAS analysiert die Website eines Prospects:
 * 1. Ruft Website ab & analysiert mit Gemini (Google Search)
 * 2. Erkennt Probleme, Chancen, USPs
 * 3. Generiert personalisierten Verkaufspitch
 * 4. Erstellt Demo-HTML-Seite mit KI-Bot etc.
 * Body: { prospectId }
 */
export async function POST(req: NextRequest) {
  const t0 = Date.now()
  try {
    const { prospectId } = await req.json()
    if (!prospectId) return NextResponse.json({ error: 'prospectId fehlt' }, { status: 400 })

    const db = svc()
    const { data: p, error: pe } = await db.from('prospects').select('*').eq('id', prospectId).single()
    if (pe || !p) return NextResponse.json({ error: 'Prospect nicht gefunden' }, { status: 404 })

    if (!p.website) return NextResponse.json({ error: 'Kein Website-URL beim Prospect eingetragen' }, { status: 400 })

    const website = p.website.startsWith('http') ? p.website : `https://${p.website}`
    const firma = p.company || p.name
    const branche = p.industry || 'Unbekannt'
    const ort = p.city || 'Kärnten'

    // SCHRITT 1: Website analysieren via Gemini + Google Search
    const analysisResult = await callLLM(
      'gemini-2.5-flash',
      `Du bist LUKAS, der Website-Analyst und Sales-Stratege von hBrand.at (Klagenfurt, Kärnten).
Du analysierst Websites von KMU und findest heraus warum sie digitale Unterstützung brauchen.
Sei direkt, konkret und fokussiert auf verkaufsrelevante Punkte.
Antworte NUR im angegebenen JSON-Format.`,
      `Analysiere die Website: ${website}
Firma: ${firma}
Branche: ${branche}
Ort: ${ort}

Besuche die Website und antworte NUR mit diesem JSON (kein Markdown, kein Text davor/danach):
{
  "firma_typ": "Was macht die Firma genau? (1-2 Sätze)",
  "zielgruppe": "Wer sind ihre Kunden?",
  "website_score": 0,
  "website_probleme": [
    "Problem 1",
    "Problem 2"
  ],
  "website_staerken": [
    "Stärke 1"
  ],
  "ki_potenzial": [
    "KI-Möglichkeit 1: Beschreibung",
    "KI-Möglichkeit 2: Beschreibung"
  ],
  "verkaufspitch": "Persönlicher Gesprächseinstieg für Alexander: Was soll er konkret ansprechen? (3-4 Sätze, direkt und überzeugend)",
  "empfohlenes_paket": "starter|professional|enterprise",
  "paket_begruendung": "Warum dieses Paket?",
  "demo_features": ["Feature 1", "Feature 2", "Feature 3"],
  "prioritaet": "hoch|mittel|niedrig",
  "prioritaet_grund": "Warum diese Priorität?"
}`,
      2048
    )

    // JSON aus Antwort extrahieren
    let analysis: any = {}
    try {
      const jsonMatch = analysisResult.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) analysis = JSON.parse(jsonMatch[0])
    } catch {
      analysis = { verkaufspitch: analysisResult.text, website_probleme: [], ki_potenzial: [] }
    }

    await logAiJob({
      employee_key: 'lukas', model: analysisResult.model,
      input_tokens: analysisResult.input_tokens, output_tokens: analysisResult.output_tokens,
      cost_usd: analysisResult.cost_usd, duration_ms: Date.now() - t0, status: 'completed',
      prompt_summary: `Website-Analyse: ${website}`,
      result_summary: analysis.verkaufspitch?.slice(0, 200) ?? '',
    })

    // SCHRITT 2: Demo-Seite generieren mit Claude Sonnet
    const demoFeatures = (analysis.demo_features || ['KI-Chatbot', 'Terminbuchung', 'Kontaktformular']).join(', ')
    const demoResult = await callLLM(
      'claude-sonnet-4-6',
      `Du bist ein Frontend-Entwickler der professionelle Demo-Websites als HTML erstellt.
Erstelle eine vollständige, beeindruckende HTML-Seite — kein Markdown, nur reines HTML.
Modern, dunkel, professionell. Inline CSS & JS. Keine externen Abhängigkeiten außer CDN-Fonts.`,
      `Erstelle eine Demo-Website für:
Firma: ${firma}
Branche: ${branche}
Ort: ${ort}
Website: ${website}
Firmentyp: ${analysis.firma_typ || ''}

Features die gezeigt werden sollen: ${demoFeatures}

Die Seite soll zeigen WIE die Firma mit hBrand.at-KI aussehen könnte.
Enthält:
- Hero mit Firma-Name, Branche, Ort
- Mindestens einen der Features als Demo (z.B. KI-Chat-Widget das auf Fragen antwortet)
- Kontaktbereich
- "Powered by hBrand.at KI" Footer
- Moderne dunkle Optik, Lila/Violet Akzentfarbe wie hBrand
- Vollständig funktionsfähig als standalone HTML

Gib NUR den HTML-Code zurück, nichts anderes.`,
      4096
    )

    const demoHtml = demoResult.text.replace(/^```html?\n?/, '').replace(/\n?```$/, '')

    // Prospect updaten
    const updateData: any = {
      website_analysis: analysis,
      demo_page_html: demoHtml,
      analysis_at: new Date().toISOString(),
    }

    // Priorität & Paket automatisch setzen wenn erkannt
    if (analysis.prioritaet && ['hoch','mittel','niedrig'].includes(analysis.prioritaet)) {
      updateData.priority = analysis.prioritaet
    }
    if (analysis.empfohlenes_paket && ['starter','professional','enterprise'].includes(analysis.empfohlenes_paket)) {
      updateData.package = analysis.empfohlenes_paket
    }

    await db.from('prospects').update(updateData).eq('id', prospectId)

    return NextResponse.json({
      ok: true,
      analysis,
      demo_html: demoHtml,
      cost_usd: analysisResult.cost_usd + demoResult.cost_usd,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
