import { createClient } from '@supabase/supabase-js'

// Fallback-Werte verhindern Build-Crash, wenn Env-Vars (z.B. beim Prerender) fehlen.
// Zur Laufzeit auf dem Server sind die echten Werte gesetzt.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ── Activity-Logger: jede relevante Aktion landet in der Timeline ──
export async function logActivity(input: {
  entity_type: 'customer' | 'order' | 'invoice' | 'ticket' | 'asset'
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
  order_id?: string | null
  customer_id: string
  invoice_number: string
  amount: number
  tax_rate: number
  net_amount: number
  tax_amount: number
  gross_amount: number
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  issue_date?: string
  due_date?: string
  paid_at?: string
  payment_terms?: string
  notes?: string
  created_at: string
  updated_at?: string
  customers?: Customer
  orders?: Order
  invoice_items?: InvoiceItem[]
}

export type InvoiceItem = {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit: string
  unit_price: number
  position: number
  created_at: string
}

export type Company = {
  name: string
  owner?: string
  email?: string
  currency?: string
  vat_id?: string
  address?: string
  zip_city?: string
  phone?: string
  iban?: string
  bic?: string
  bank?: string
  kleinunternehmer?: boolean
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
  entity_type: 'customer' | 'order' | 'invoice' | 'ticket' | 'asset'
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

// ── Asset-Maschine ──
export type AssetType =
  | 'angebot' | 'rechnung' | 'stellenanzeige' | 'newsletter'
  | 'datenschutz' | 'social_post' | 'website_konzept' | 'sonstiges'

export type AssetStatus = 'entwurf' | 'in_review' | 'freigegeben' | 'versendet' | 'abgelehnt'

export type Asset = {
  id: string
  customer_id?: string
  order_id?: string
  type: AssetType
  title: string
  brief?: string
  content?: string
  format: 'markdown' | 'html'
  status: AssetStatus
  version: number
  model?: string
  metadata?: Record<string, unknown>
  approved_at?: string
  approved_by?: string
  sent_at?: string
  created_at: string
  updated_at: string
  customers?: Customer
}

export type AssetVersion = {
  id: string
  asset_id: string
  version: number
  content?: string
  note?: string
  created_by?: string
  created_at: string
}

// Asset-Typen-Katalog: was die Maschine erzeugen kann
export const ASSET_TYPES: { key: AssetType; label: string; icon: string; desc: string }[] = [
  { key: 'angebot',         label: 'Angebot',            icon: 'FileText',     desc: 'Professionelles Angebot mit Positionen & Preisen' },
  { key: 'rechnung',        label: 'Rechnung',           icon: 'Receipt',      desc: 'Rechtskonforme Rechnung mit UID & Steuer' },
  { key: 'stellenanzeige',  label: 'Stellenanzeige',     icon: 'Briefcase',    desc: 'Ansprechende Job-Ausschreibung' },
  { key: 'newsletter',      label: 'Newsletter',         icon: 'Mail',         desc: 'E-Mail-Newsletter mit klarer Botschaft' },
  { key: 'datenschutz',     label: 'Datenschutzerklärung', icon: 'Shield',     desc: 'DSGVO-konforme Datenschutzerklärung' },
  { key: 'social_post',     label: 'Social-Media-Post',  icon: 'Share2',       desc: 'Post für LinkedIn, Instagram & Co.' },
  { key: 'website_konzept', label: 'Website-Konzept',    icon: 'Layout',       desc: 'Struktur, Seiten & Inhalte für eine Website' },
  { key: 'sonstiges',       label: 'Sonstiges',          icon: 'Sparkles',     desc: 'Freies Dokument nach Beschreibung' },
]

// Status-Anzeige für Assets
export const ASSET_STATUS_META: Record<AssetStatus, { label: string; color: string }> = {
  entwurf:     { label: 'Entwurf',     color: 'bg-zinc-500/10 text-zinc-300 border-zinc-500/20' },
  in_review:   { label: 'In Review',   color: 'bg-amber-500/10 text-amber-300 border-amber-500/20' },
  freigegeben: { label: 'Freigegeben', color: 'bg-green-500/10 text-green-300 border-green-500/20' },
  versendet:   { label: 'Versendet',   color: 'bg-blue-500/10 text-blue-300 border-blue-500/20' },
  abgelehnt:   { label: 'Abgelehnt',   color: 'bg-red-500/10 text-red-300 border-red-500/20' },
}

// ── KI-Belegschaft (digitale Mitarbeiter) ──
export type EmployeeAutonomy = 'on_task' | 'autonomous' | 'background'
export type EmployeeStatus = 'idle' | 'working' | 'blocked' | 'offline'

export type Employee = {
  id: string
  key: string
  name: string
  role_title: string
  emoji: string
  color: string
  description?: string
  system_prompt: string
  model: string
  tools?: string[]
  autonomy: EmployeeAutonomy
  status: EmployeeStatus
  is_active: boolean
  sort_order: number
  stats?: Record<string, unknown>
  created_at: string
  updated_at?: string
}

export type TaskStatus =
  | 'inbox' | 'working' | 'needs_chef' | 'approved'
  | 'handoff' | 'done' | 'failed' | 'cancelled'

export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent'

export type Task = {
  id: string
  assignee?: string | null
  created_by?: string | null
  customer_id?: string | null
  order_id?: string | null
  title: string
  brief?: string
  result?: string
  priority: TaskPriority
  status: TaskStatus
  needs_approval: boolean
  handoff_to?: string | null
  metadata?: Record<string, unknown>
  error?: string
  started_at?: string
  finished_at?: string
  created_at: string
  updated_at?: string
  employees?: Employee          // assignee join
  customers?: Customer
}

// Anzeige-Metadaten für Task-Status
export const TASK_STATUS_META: Record<TaskStatus, { label: string; color: string }> = {
  inbox:      { label: 'Im Eingang',      color: 'bg-blue-500/10 text-blue-300 border-blue-500/20' },
  working:    { label: 'In Arbeit',       color: 'bg-violet-500/10 text-violet-300 border-violet-500/20' },
  needs_chef: { label: 'Wartet auf Chef', color: 'bg-amber-500/10 text-amber-300 border-amber-500/20' },
  approved:   { label: 'Freigegeben',     color: 'bg-green-500/10 text-green-300 border-green-500/20' },
  handoff:    { label: 'Übergabe',        color: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20' },
  done:       { label: 'Erledigt',        color: 'bg-zinc-500/10 text-zinc-300 border-zinc-500/20' },
  failed:     { label: 'Fehler',          color: 'bg-red-500/10 text-red-300 border-red-500/20' },
  cancelled:  { label: 'Abgebrochen',     color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
}

export const EMPLOYEE_STATUS_META: Record<EmployeeStatus, { label: string; dot: string }> = {
  idle:    { label: 'Bereit',    dot: 'bg-green-400' },
  working: { label: 'Arbeitet',  dot: 'bg-violet-400 animate-pulse' },
  blocked: { label: 'Blockiert', dot: 'bg-amber-400' },
  offline: { label: 'Offline',   dot: 'bg-zinc-600' },
}
