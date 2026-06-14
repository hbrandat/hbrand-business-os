'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, type Customer } from '@/lib/supabase'
import { formatCurrency, cn } from '@/lib/utils'
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'

type Item = { description: string; quantity: number; unit: string; unit_price: number }

export default function NewInvoicePage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])

  const [customerId, setCustomerId] = useState('')
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 14)
    return d.toISOString().slice(0, 10)
  })
  const [taxRate, setTaxRate] = useState(20)
  const [notes, setNotes] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('Zahlbar innerhalb von 14 Tagen ohne Abzug.')
  const [items, setItems] = useState<Item[]>([
    { description: '', quantity: 1, unit: 'Stk', unit_price: 0 },
  ])

  useEffect(() => {
    supabase
      .from('customers')
      .select('id, name, company')
      .order('name')
      .then(({ data }) => setCustomers((data as any) ?? []))
  }, [])

  const net = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0)
  const tax = net * (Number(taxRate) || 0) / 100
  const gross = net + tax

  function updateItem(idx: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }
  function addItem() {
    setItems((prev) => [...prev, { description: '', quantity: 1, unit: 'Stk', unit_price: 0 }])
  }
  function removeItem(idx: number) {
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev))
  }

  async function save() {
    setError(null)
    if (!customerId) {
      setError('Bitte einen Kunden auswählen.')
      return
    }
    const validItems = items.filter((i) => i.description.trim() !== '')
    if (validItems.length === 0) {
      setError('Mindestens eine Position mit Beschreibung ist nötig.')
      return
    }
    setSaving(true)
    const { data: inv, error: invErr } = await supabase
      .from('invoices')
      .insert({
        customer_id: customerId,
        issue_date: issueDate,
        due_date: dueDate,
        tax_rate: taxRate,
        net_amount: net,
        tax_amount: tax,
        gross_amount: gross,
        amount: gross,
        status: 'draft',
        notes: notes.trim() || null,
        payment_terms: paymentTerms.trim() || null,
      })
      .select()
      .single()

    if (invErr || !inv) {
      setSaving(false)
      setError(`Fehler beim Speichern: ${invErr?.message ?? 'unbekannt'}`)
      return
    }

    const rows = validItems.map((it, idx) => ({
      invoice_id: inv.id,
      description: it.description,
      quantity: Number(it.quantity) || 0,
      unit: it.unit || 'Stk',
      unit_price: Number(it.unit_price) || 0,
      position: idx,
    }))
    const { error: itemsErr } = await supabase.from('invoice_items').insert(rows)
    setSaving(false)
    if (itemsErr) {
      setError(`Rechnung gespeichert, aber Positionen fehlgeschlagen: ${itemsErr.message}`)
      return
    }
    router.push(`/dashboard/invoices/${inv.id}`)
  }

  return (
    <div className="p-6 max-w-3xl space-y-6 animate-in">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/invoices"
          className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-2xl font-bold text-white">Neue Rechnung</h1>
      </div>

      <div className="glass rounded-2xl p-6 space-y-4">
        {/* Kunde + Daten */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-zinc-400 font-medium mb-1.5 block">Kunde *</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500"
            >
              <option value="">— wählen —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.company ? ` (${c.company})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-400 font-medium mb-1.5 block">USt-Satz %</label>
            <select
              value={taxRate}
              onChange={(e) => setTaxRate(Number(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500"
            >
              <option value={20}>20 % (Normalsatz)</option>
              <option value={13}>13 %</option>
              <option value={10}>10 % (ermäßigt)</option>
              <option value={0}>0 % (Kleinunternehmer/Reverse-Charge)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-400 font-medium mb-1.5 block">Rechnungsdatum</label>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 font-medium mb-1.5 block">Fällig am</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500"
            />
          </div>
        </div>

        {/* Positionen */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-zinc-400 font-medium">Positionen</label>
            <button
              onClick={addItem}
              className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300"
            >
              <Plus className="w-3.5 h-3.5" /> Position
            </button>
          </div>
          <div className="space-y-2">
            {items.map((it, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <input
                  value={it.description}
                  onChange={(e) => updateItem(idx, { description: e.target.value })}
                  placeholder="Beschreibung"
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-violet-500"
                />
                <input
                  type="number"
                  value={it.quantity}
                  onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                  placeholder="Menge"
                  className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-sm text-white text-right outline-none focus:border-violet-500"
                />
                <input
                  value={it.unit}
                  onChange={(e) => updateItem(idx, { unit: e.target.value })}
                  placeholder="Stk"
                  className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-sm text-white outline-none focus:border-violet-500"
                />
                <input
                  type="number"
                  value={it.unit_price}
                  onChange={(e) => updateItem(idx, { unit_price: Number(e.target.value) })}
                  placeholder="Preis"
                  className="w-24 bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-sm text-white text-right outline-none focus:border-violet-500"
                />
                <div className="w-24 text-right text-sm text-zinc-300 py-2">
                  {formatCurrency((Number(it.quantity) || 0) * (Number(it.unit_price) || 0))}
                </div>
                <button
                  onClick={() => removeItem(idx)}
                  className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Summen */}
        <div className="border-t border-white/10 pt-4 space-y-1 text-sm">
          <div className="flex justify-between text-zinc-400">
            <span>Netto</span>
            <span>{formatCurrency(net)}</span>
          </div>
          <div className="flex justify-between text-zinc-400">
            <span>USt ({taxRate} %)</span>
            <span>{formatCurrency(tax)}</span>
          </div>
          <div className="flex justify-between text-white font-semibold text-base pt-1">
            <span>Gesamt</span>
            <span>{formatCurrency(gross)}</span>
          </div>
        </div>

        {/* Zahlungsbedingungen + Notizen */}
        <div>
          <label className="text-xs text-zinc-400 font-medium mb-1.5 block">Zahlungsbedingungen</label>
          <input
            value={paymentTerms}
            onChange={(e) => setPaymentTerms(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-zinc-300 outline-none focus:border-violet-500"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-400 font-medium mb-1.5 block">Notizen (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Interne oder sichtbare Notizen…"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-zinc-300 placeholder:text-zinc-600 outline-none focus:border-violet-500 resize-none"
          />
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-xl transition-all font-medium w-full justify-center"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Wird gespeichert…' : 'Rechnung anlegen'}
        </button>
      </div>
    </div>
  )
}
