/**
 * hBrand Web Search – für VERA (Vertrieb & Akquise)
 *
 * Unterstützte Provider (in Priorität):
 *   1. Brave Search API  → BRAVE_SEARCH_API_KEY in .env.local
 *   2. Serper (Google)   → SERPER_API_KEY in .env.local
 *
 * Ohne Key: leere Ergebnisse + klare Fehlermeldung.
 * VERA darf NIEMALS Daten erfinden – das wird hier erzwungen.
 */

export type SearchResult = {
  title: string
  url: string
  description: string
}

export type WebSearchResponse = {
  query: string
  results: SearchResult[]
  provider?: string
  error?: string
}

export async function webSearch(query: string, maxResults = 5): Promise<WebSearchResponse> {
  const braveKey = process.env.BRAVE_SEARCH_API_KEY
  const serperKey = process.env.SERPER_API_KEY

  if (braveKey) return braveSearch(query, maxResults, braveKey)
  if (serperKey) return serperSearch(query, maxResults, serperKey)

  return {
    query,
    results: [],
    error: 'KEIN_SUCH_API: Kein Suchschlüssel konfiguriert (BRAVE_SEARCH_API_KEY oder SERPER_API_KEY fehlt in .env.local).',
  }
}

async function braveSearch(query: string, max: number, key: string): Promise<WebSearchResponse> {
  try {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${max}&country=AT&search_lang=de`
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'X-Subscription-Token': key,
      },
    })
    if (!res.ok) throw new Error(`Brave ${res.status}: ${(await res.text()).slice(0, 120)}`)
    const data = await res.json()
    const results: SearchResult[] = (data.web?.results ?? []).slice(0, max).map((r: any) => ({
      title: r.title ?? '',
      url: r.url ?? '',
      description: r.description ?? r.extra_snippets?.[0] ?? '',
    }))
    return { query, results, provider: 'brave' }
  } catch (e: any) {
    return { query, results: [], error: e.message, provider: 'brave' }
  }
}

async function serperSearch(query: string, max: number, key: string): Promise<WebSearchResponse> {
  try {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, num: max, gl: 'at', hl: 'de' }),
    })
    if (!res.ok) throw new Error(`Serper ${res.status}`)
    const data = await res.json()
    const results: SearchResult[] = (data.organic ?? []).slice(0, max).map((r: any) => ({
      title: r.title ?? '',
      url: r.link ?? '',
      description: r.snippet ?? '',
    }))
    return { query, results, provider: 'serper' }
  } catch (e: any) {
    return { query, results: [], error: e.message, provider: 'serper' }
  }
}

/**
 * Formatiert Suchergebnisse als LLM-lesbaren Block.
 * Enthält immer die strikte "nicht erfinden"-Anweisung.
 */
export function formatSearchResults(resp: WebSearchResponse): string {
  const lines: string[] = []

  if (resp.error && resp.results.length === 0) {
    lines.push(`⚠ SUCHE FEHLGESCHLAGEN: ${resp.error}`)
    lines.push('→ DU DARFST KEINE Kontaktdaten, Telefonnummern, E-Mails oder Adressen erfinden!')
    lines.push('→ Teile dem Chef mit, dass der Suchservice konfiguriert werden muss.')
    return lines.join('\n')
  }

  if (resp.results.length === 0) {
    lines.push(`⚠ KEINE ERGEBNISSE für Suche: "${resp.query}"`)
    lines.push('→ DU DARFST KEINE Daten erfinden. Dem Chef mitteilen und andere Suchbegriffe vorschlagen.')
    return lines.join('\n')
  }

  lines.push(`🔍 SUCHERGEBNISSE (${resp.provider ?? 'web'}) für: "${resp.query}"\n`)
  resp.results.forEach((r, i) => {
    lines.push(`[${i + 1}] ${r.title}`)
    lines.push(`    URL: ${r.url}`)
    if (r.description) lines.push(`    ${r.description}`)
    lines.push('')
  })
  lines.push('─────────────────────────────────────────')
  lines.push('REGEL: Verwende NUR Daten aus den obigen Ergebnissen.')
  lines.push('Erfinde NIEMALS Telefonnummern, E-Mails, Adressen oder Firmennamen.')
  lines.push('Wenn eine Info fehlt, schreibe "nicht gefunden" und schlage vor, die Website direkt zu besuchen.')

  return lines.join('\n')
}

/**
 * Leitet aus einem Task-Titel einen sinnvollen Suchbegriff für Österreich ab.
 * Wird genutzt, wenn VERA selbst keine Suchbegriffe definiert.
 */
export function buildSearchQuery(taskTitle: string, taskBrief?: string): string {
  const base = taskBrief ? `${taskTitle} ${taskBrief}` : taskTitle
  // Einfache Heuristik: kürzen + Österreich-Kontext
  const cleaned = base.replace(/\s+/g, ' ').trim().slice(0, 120)
  return `${cleaned} Kärnten Österreich Kontakt`
}
