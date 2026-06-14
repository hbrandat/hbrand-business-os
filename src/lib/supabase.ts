import { createClient } from '@supabase/supabase-js'

// Fallback-Werte verhindern Build-Crash, wenn Env-Vars (z.B. beim Prerender) fehlen.
// Zur Laufzeit auf dem Server sind die echten Werte gesetzt.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ── Activity-Logger: jede relevante Aktion landet in der Timeline ──
export async function logActivity(input: {
  entity_type: 'customer' | 'order' | 'invoice' | 'ticket'
  entity_id: string
  customer_id?: string | null
  type: 'note' | 'status_change' | 'email' | 'call' | 'meeting' | 'file' | 'invoice' | 'payment' | 'ticket' | 'system'
  title: string
  description?: string
  metadata?: Record<string, unknown>
}) {
  try {
    await supabase.from('activities').insert({
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      customer_id: input.customer_id ?? null,
      type: input.type,
      title: input.title,
      description: input.description ?? null,
      metadata: input.metadata ?? {},
    })
  } catch (e) {
    console.error('logActivity failed', e)
  }
}

export type Customer = {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  address?: string
  city?: string
  country?: string
  notes?: string
  status: 'active' | 'inactive' | 'lead'
  discount_percent?: number
  source?: string
  tags?: string[]
  vat_id?: string
  website?: string
  first_contact_at?: string
  created_at: string
}

export type Order = {
  id: string
  customer_id: string
  title: string
  description?: string
  status: 'new' | 'in_progress' | 'review' | 'done' | 'cancelled'
  type: 'fixed' | 'hourly' | 'retainer'
  price?: number
  hourly_rate?: number
  hours_logged?: number
  discount_percent?: number
  due_date?: string
  telegram_notified?: boolean
  stage?: 'kontakt' | 'angebot' | 'zusage' | 'in_arbeit' | 'review' | 'abgeschlossen'
  priority?: 'niedrig' | 'normal' | 'hoch' | 'dringend'
  tags?: string[]
  created_at: string
  customers?: Customer
}

export type Invoice = {
  id: string
  order_id: string
  customer_id: string
  invoice_number: string
  amount: number
  tax_percent: number
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  due_date?: string
  paid_at?: string
  created_at: string
  customers?: Customer
  orders?: Order
}

export type AiJob = {
  id: string
  order_id?: string
  customer_id?: string
  model: string
  provider: string
  input_tokens: number
  output_tokens: number
  cost_usd: number
  duration_seconds?: number
  status: 'running' | 'done' | 'failed'
  result_summary?: string
  created_at: string
  customers?: Customer
  orders?: Order
}

export type ApiCost = {
  id: string
  provider: string
  model: string
  total_input_tokens: number
  total_output_tokens: number
  total_cost_usd: number
  total_cost_eur?: number
  date: string
}

export type Activity = {
  id: string
  entity_type: 'customer' | 'order' | 'invoice' | 'ticket'
  entity_id: string
  customer_id?: string
  type: 'note' | 'status_change' | 'email' | 'call' | 'meeting' | 'file' | 'invoice' | 'payment' | 'ticket' | 'system'
  title: string
  description?: string
  metadata?: Record<string, unknown>
  created_by?: string
  created_at: string
}

export type OrderItem = {
  id: string
  order_id: string
  description: string
  quantity: number
  unit: string
  unit_price: number
  position: number
  created_at: string
}

export type TimeEntry = {
  id: string
  order_id: string
  customer_id?: string
  description: string
  minutes: number
  billable: boolean
  entry_date: string
  created_at: string
}

export type Ticket = {
  id: string
  customer_id?: string
  order_id?: string
  ticket_number?: string
  subject: string
  description?: string
  status: 'offen' | 'in_bearbeitung' | 'wartet_kunde' | 'gelöst' | 'geschlossen'
  priority: 'niedrig' | 'normal' | 'hoch' | 'dringend'
  channel: 'dashboard' | 'email' | 'telefon' | 'telegram'
  assigned_to?: string
  resolved_at?: string
  created_at: string
  updated_at: string
  customers?: Customer
}

export type TicketMessage = {
  id: string
  ticket_id: string
  sender: string
  is_internal: boolean
  body: string
  created_at: string
}

export type CustomerFile = {
  id: string
  customer_id?: string
  order_id?: string
  name: string
  original_name?: string
  drive_id?: string
  drive_url?: string
  mime_type?: string
  size_bytes?: number
  ai_named: boolean
  category?: string
  created_at: string
}

// Pipeline-Stufen für Aufträge (Erstkontakt → Abschluss)
export const ORDER_STAGES = [
  { key: 'kontakt', label: 'Erstkontakt' },
  { key: 'angebot', label: 'Angebot' },
  { key: 'zusage', label: 'Zusage' },
  { key: 'in_arbeit', label: 'In Arbeit' },
  { key: 'review', label: 'Review' },
  { key: 'abgeschlossen', label: 'Abgeschlossen' },
] as const
