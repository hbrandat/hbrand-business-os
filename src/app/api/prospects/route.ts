import { NextRequest, NextResponse } from 'next/server'
import { svc } from '@/lib/engine'

// GET /api/prospects – alle Prospects laden (optional ?status=xxx)
export async function GET(req: NextRequest) {
  const db = svc()
  const status = req.nextUrl.searchParams.get('status')

  let query = db.from('prospects').select('*').order('created_at', { ascending: false })
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ prospects: data })
}

// POST /api/prospects – neuen Prospect anlegen (VERA oder manuell)
export async function POST(req: NextRequest) {
  const db = svc()
  try {
    const body = await req.json()
    const { name, company, phone, email, website, address, city, industry,
            priority, package: pkg, source, notes } = body

    if (!name) return NextResponse.json({ error: 'name ist Pflichtfeld' }, { status: 400 })

    const { data, error } = await db.from('prospects').insert({
      name, company, phone, email, website, address,
      city: city || 'Kärnten',
      industry,
      priority: priority || 'mittel',
      package: pkg || null,
      source: source || 'vera',
      notes: notes || null,
      status: 'neu',
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ prospect: data }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
