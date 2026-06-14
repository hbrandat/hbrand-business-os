import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Lazy-Init verhindert Build-Crash beim Prerender ohne Env-Vars.
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key'
  )
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase()
    const { orderId } = await req.json()
    if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 })

    const { data: order } = await supabase
      .from('orders')
      .select('*, customers(name, company, email, phone)')
      .eq('id', orderId)
      .single()

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    const customer = order.customers as any
    const statusEmoji: Record<string, string> = {
      new: '🆕', in_progress: '⚙️', review: '👀', done: '✅', cancelled: '❌'
    }

    const message = `
${statusEmoji[order.status] || '📋'} *Auftrags-Update*

📌 *${order.title}*
👤 Kunde: ${customer?.company || customer?.name}
📊 Status: ${order.status.replace('_', ' ').toUpperCase()}
${order.price ? `💶 Betrag: ${order.price.toFixed(2)} EUR` : ''}
${order.due_date ? `📅 Fällig: ${new Date(order.due_date).toLocaleDateString('de-AT')}` : ''}
${order.description ? `\n📝 ${order.description}` : ''}

_HBrand.at Business OS_
    `.trim()

    const botToken = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID

    if (!botToken || !chatId) {
      return NextResponse.json({ error: 'Telegram not configured' }, { status: 500 })
    }

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' }),
    })

    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ error: err }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
