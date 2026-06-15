import { NextRequest, NextResponse } from 'next/server'
import { svc, callLLM } from '@/lib/engine'
import { sendEmail } from '@/lib/email'

/**
 * POST /api/prospects/[id]/convert
 * Konvertiert einen Prospect zum echten Kunden:
 * 1. Kundendatensatz anlegen
 * 2. Prospect auf "gewonnen" setzen + customer_id verknüpfen
 * 3. Willkommens-E-Mail generieren (Claude) + senden
 * 4. DSGVO-E-Mail senden
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = svc()
  const { id } = await params

  try {
    // Prospect laden
    const { data: prospect, error: pe } = await db.from('prospects').select('*').eq('id', id).single()
    if (pe || !prospect) return NextResponse.json({ error: 'Prospect nicht gefunden' }, { status: 404 })
    if (prospect.status === 'gewonnen') return NextResponse.json({ error: 'Bereits konvertiert' }, { status: 400 })

    // 1. Kunden anlegen
    const { data: customer, error: ce } = await db.from('customers').insert({
      name: prospect.name,
      company: prospect.company || '',
      email: prospect.email || '',
      phone: prospect.phone || '',
      website: prospect.website || '',
      address: prospect.address || '',
      city: prospect.city || 'Kärnten',
      country: 'Österreich',
      notes: [
        `Paket: ${prospect.package || 'noch nicht gewählt'}`,
        `Quelle: ${prospect.source}`,
        `Akquise-Notizen: ${prospect.notes || '—'}`,
      ].join('\n'),
      status: 'active',
    }).select().single()

    if (ce || !customer) return NextResponse.json({ error: `Kunde anlegen fehlgeschlagen: ${ce?.message}` }, { status: 500 })

    // 2. Prospect aktualisieren
    await db.from('prospects').update({
      status: 'gewonnen',
      customer_id: customer.id,
      last_contact_at: new Date().toISOString(),
    }).eq('id', id)

    // 3. Willkommens-E-Mail via Claude generieren
    let welcomeText = ''
    let welcomeSent = false
    let dsgvoSent = false

    if (prospect.email) {
      try {
        const llmResult = await callLLM(
          'claude-haiku-3-5',
          'Du bist CONNI, die freundliche Texterin von hBrand.at. Schreibe professionelle, persönliche E-Mails auf Deutsch. Kurz, herzlich, auf du-Basis. Keine Floskeln.',
          `Schreibe eine kurze Willkommens-E-Mail an ${prospect.name} von ${prospect.company || 'ihrem Betrieb'} in Kärnten.
Sie haben sich gerade für hBrand.at entschieden${prospect.package ? ` (Paket: ${prospect.package})` : ''}.
Erwähne: persönliche Betreuung, KI-System startet bald, nächste Schritte werden besprochen.
Unterschrift: Alexander Hillebrand, hBrand.at, 0676 6526999
Format: Nur den E-Mail-Text, kein Betreff.`,
          512
        )
        welcomeText = llmResult.text

        const emailResult = await sendEmail({
          to: prospect.email,
          subject: `Willkommen bei hBrand.at${prospect.company ? ` – ${prospect.company}` : ''}!`,
          text: welcomeText,
        })
        welcomeSent = emailResult.ok
      } catch (e) {
        console.error('Welcome-E-Mail Fehler:', e)
      }

      // 4. DSGVO-E-Mail
      try {
        const dsgvoResult = await sendEmail({
          to: prospect.email,
          subject: 'Datenschutzerklärung – hBrand.at',
          text: DSGVO_TEMPLATE(prospect.name, prospect.company),
        })
        dsgvoSent = dsgvoResult.ok
      } catch (e) {
        console.error('DSGVO-E-Mail Fehler:', e)
      }

      // Gesendet-Flag aktualisieren
      await db.from('prospects').update({ welcome_sent: welcomeSent, dsgvo_sent: dsgvoSent }).eq('id', id)
    }

    // Activity-Log
    await db.from('activities').insert({
      entity_type: 'order', entity_id: customer.id, customer_id: customer.id,
      type: 'system',
      title: `${prospect.company || prospect.name} als neuer Kunde übernommen`,
      description: [
        welcomeSent ? '✅ Willkommens-E-Mail gesendet' : '⚠ Willkommens-E-Mail konnte nicht gesendet werden',
        dsgvoSent ? '✅ DSGVO-E-Mail gesendet' : '⚠ DSGVO-E-Mail konnte nicht gesendet werden',
      ].join(' · '),
    }).then(() => {}, () => {})

    return NextResponse.json({
      ok: true,
      customer_id: customer.id,
      welcome_sent: welcomeSent,
      dsgvo_sent: dsgvoSent,
      welcome_text: welcomeText,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ── DSGVO-Template ────────────────────────────────────────────────────────────
function DSGVO_TEMPLATE(name: string, company?: string): string {
  return `Betreff: Datenschutzerklärung – hBrand.at

Hallo ${name}!

Im Rahmen unserer Zusammenarbeit verarbeiten wir deine personenbezogenen Daten. Hier eine kurze Übersicht:

VERANTWORTLICHER
Alexander Hillebrand
hBrand.at
Am Kogel 5, 9063 Karnburg
E-Mail: alexander@hbrand.at
Tel.: 0676 6526999

WELCHE DATEN WIR VERARBEITEN
• Name und Kontaktdaten (${company ? `Firma: ${company}, ` : ''}Name: ${name})
• Kommunikationsverläufe (E-Mails, Anrufe)
• Projekt- und Auftragsdaten
• Abrechnungsdaten

ZWECK DER VERARBEITUNG
Wir verarbeiten deine Daten ausschließlich zur Erbringung unserer vereinbarten Dienstleistungen (KI-gestützte Digitalisierung) und zur Abwicklung der Geschäftsbeziehung.

RECHTSGRUNDLAGE
Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)

SPEICHERDAUER
Deine Daten werden für die Dauer der Geschäftsbeziehung gespeichert. Danach werden sie entsprechend der gesetzlichen Aufbewahrungsfristen (7 Jahre für Buchhaltungsunterlagen) aufbewahrt und dann gelöscht.

DEINE RECHTE
Du hast das Recht auf:
• Auskunft über deine gespeicherten Daten
• Berichtigung unrichtiger Daten
• Löschung (soweit keine gesetzlichen Aufbewahrungspflichten entgegenstehen)
• Widerspruch gegen die Verarbeitung
• Datenübertragbarkeit
• Beschwerde bei der Datenschutzbehörde (dsb.gv.at)

Bitte bestätige, dass du diese Datenschutzerklärung gelesen und zur Kenntnis genommen hast.
Du kannst jederzeit unter alexander@hbrand.at Auskunft oder Löschung deiner Daten beantragen.

Mit freundlichen Grüßen
Alexander Hillebrand
hBrand.at – KI-gestützte Digitalisierung für Kärnten
Tel.: 0676 6526999 | alexander@hbrand.at`
}
