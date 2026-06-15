import { NextRequest, NextResponse } from 'next/server'
import { svc } from '@/lib/engine'

// PATCH /api/prospects/[id] – Status, Notizen, Rückruf etc. aktualisieren
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = svc()
  const { id } = await params
  try {
    const body = await req.json()
    const { status, notes, rueckruf_at, priority, package: pkg,
            phone, email, website, contact_attempt } = body

    const update: Record<string, any> = {}
    if (status !== undefined)     update.status = status
    if (notes !== undefined)      update.notes = notes
    if (rueckruf_at !== undefined) update.rueckruf_at = rueckruf_at
    if (priority !== undefined)   update.priority = priority
    if (pkg !== undefined)        update.package = pkg
    if (phone !== undefined)      update.phone = phone
    if (email !== undefined)      update.email = email
    if (website !== undefined)    update.website = website

    // Kontaktversuch registrieren
    if (contact_attempt) {
      update.last_contact_at = new Date().toISOString()
      // Zähler erhöhen via RPC oder Read-Modify-Write
      const { data: current } = await db.from('prospects').select('contact_attempts').eq('id', id).single()
      update.contact_attempts = (current?.contact_attempts ?? 0) + 1
    }

    const { data, error } = await db.from('prospects').update(update).eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ prospect: data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE /api/prospects/[id] – Prospect löschen (nur Abgelehnte)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = svc()
  const { id } = await params
  const { error } = await db.from('prospects').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
