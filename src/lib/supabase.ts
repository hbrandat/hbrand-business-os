import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
