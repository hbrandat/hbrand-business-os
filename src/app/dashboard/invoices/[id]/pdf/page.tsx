'use client'

import { use, useEffect, useState } from 'react'
import { supabase, type Invoice, type InvoiceItem, type Company } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function InvoicePdfPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [company, setCompany] = useState<Company | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('invoices').select('*, customers(*)').eq('id', id).single(),
      supabase.from('invoice_items').select('*').eq('invoice_id', id).order('position'),
      supabase.from('settings').select('value').eq('key', 'company').single(),
    ]).then(([inv, it, comp]) => {
      setInvoice(inv.data as any)
      setItems((it.data as any) ?? [])
      setCompany((comp.data?.value as any) ?? { name: 'HBrand.at' })
      setReady(true)
    })
  }, [id])

  useEffect(() => {
    if (ready && invoice) {
      const t = setTimeout(() => window.print(), 600)
      return () => clearTimeout(t)
    }
  }, [ready, invoice])

  if (!ready) return <div className="fixed inset-0 bg-white z-[9999] flex items-center justify-center text-zinc-400">Lädt…</div>
  if (!invoice) return <div className="fixed inset-0 bg-white z-[9999] flex items-center justify-center text-zinc-600">Rechnung nicht gefunden.</div>

  const cust = invoice.customers as any
  const c = company ?? { name: 'HBrand.at' }

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 18mm 16mm; }
          body * { visibility: hidden; }
          #invoice-sheet, #invoice-sheet * { visibility: visible; }
          #invoice-sheet { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Vollflächiger weißer Overlay über die Dashboard-Sidebar */}
      <div className="fixed inset-0 bg-zinc-200 z-[9999] overflow-auto py-8">
        <div className="no-print max-w-[210mm] mx-auto mb-4 flex justify-between items-center px-4">
          <button
            onClick={() => window.history.back()}
            className="text-sm text-zinc-600 hover:text-zinc-900"
          >
            ← Zurück
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm rounded-lg font-medium"
          >
            Drucken / Als PDF speichern
          </button>
        </div>

        {/* A4-Blatt */}
        <div
          id="invoice-sheet"
          className="bg-white text-zinc-900 mx-auto shadow-xl"
          style={{ width: '210mm', minHeight: '297mm', padding: '18mm 16mm', fontSize: '11px', lineHeight: 1.5 }}
        >
          {/* Kopf */}
          <div className="flex justify-between items-start mb-12">
            <div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#7c3aed', letterSpacing: '-0.02em' }}>
                {c.name}
              </div>
              {c.owner && <div className="text-zinc-600 mt-1">{c.owner}</div>}
            </div>
            <div className="text-right text-zinc-600" style={{ fontSize: '10px' }}>
              {c.address && <div>{c.address}</div>}
              {c.zip_city && <div>{c.zip_city}</div>}
              {c.email && <div>{c.email}</div>}
              {c.phone && <div>{c.phone}</div>}
              {c.vat_id && <div>UID: {c.vat_id}</div>}
            </div>
          </div>

          {/* Empfänger + Meta */}
          <div className="flex justify-between mb-10">
            <div>
              <div className="text-zinc-400 mb-1" style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Rechnungsempfänger
              </div>
              <div className="font-semibold">{cust?.company || cust?.name}</div>
              {cust?.company && cust?.name && <div>{cust.name}</div>}
              {cust?.address && <div>{cust.address}</div>}
              {(cust?.city || cust?.country) && (
                <div>
                  {cust?.city} {cust?.country}
                </div>
              )}
              {cust?.vat_id && <div className="text-zinc-600 mt-1">UID: {cust.vat_id}</div>}
            </div>
            <div className="text-right">
              <table style={{ fontSize: '10px' }}>
                <tbody>
                  <tr>
                    <td className="text-zinc-500 pr-4 py-0.5">Rechnungsnr.</td>
                    <td className="font-semibold text-right">{invoice.invoice_number}</td>
                  </tr>
                  <tr>
                    <td className="text-zinc-500 pr-4 py-0.5">Rechnungsdatum</td>
                    <td className="text-right">{formatDate(invoice.issue_date)}</td>
                  </tr>
                  <tr>
                    <td className="text-zinc-500 pr-4 py-0.5">Fällig am</td>
                    <td className="text-right">{formatDate(invoice.due_date)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Titel */}
          <h1 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>
            Rechnung {invoice.invoice_number}
          </h1>

          {/* Positionen */}
          <table className="w-full" style={{ borderCollapse: 'collapse', marginBottom: '24px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #7c3aed' }}>
                <th className="text-left py-2" style={{ fontSize: '10px', color: '#71717a' }}>Pos.</th>
                <th className="text-left py-2" style={{ fontSize: '10px', color: '#71717a' }}>Beschreibung</th>
                <th className="text-right py-2" style={{ fontSize: '10px', color: '#71717a' }}>Menge</th>
                <th className="text-right py-2" style={{ fontSize: '10px', color: '#71717a' }}>Einzelpreis</th>
                <th className="text-right py-2" style={{ fontSize: '10px', color: '#71717a' }}>Gesamt</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={it.id} style={{ borderBottom: '1px solid #e4e4e7' }}>
                  <td className="py-2 text-zinc-500">{idx + 1}</td>
                  <td className="py-2">{it.description}</td>
                  <td className="py-2 text-right">
                    {it.quantity} {it.unit}
                  </td>
                  <td className="py-2 text-right">{formatCurrency(it.unit_price)}</td>
                  <td className="py-2 text-right font-medium">{formatCurrency(it.quantity * it.unit_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Summen */}
          <div className="flex justify-end mb-10">
            <table style={{ minWidth: '240px' }}>
              <tbody>
                <tr>
                  <td className="text-zinc-500 py-1">Nettobetrag</td>
                  <td className="text-right py-1">{formatCurrency(invoice.net_amount || 0)}</td>
                </tr>
                <tr>
                  <td className="text-zinc-500 py-1">zzgl. USt ({invoice.tax_rate} %)</td>
                  <td className="text-right py-1">{formatCurrency(invoice.tax_amount || 0)}</td>
                </tr>
                <tr style={{ borderTop: '2px solid #7c3aed' }}>
                  <td className="py-2 font-bold" style={{ fontSize: '13px' }}>Gesamtbetrag</td>
                  <td className="text-right py-2 font-bold" style={{ fontSize: '13px' }}>
                    {formatCurrency(invoice.gross_amount || invoice.amount || 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {c.kleinunternehmer && (
            <p className="text-zinc-600 mb-4" style={{ fontSize: '9px' }}>
              Gemäß § 6 Abs. 1 Z 27 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).
            </p>
          )}

          {invoice.payment_terms && <p className="text-zinc-700 mb-2">{invoice.payment_terms}</p>}
          {invoice.notes && <p className="text-zinc-600 mb-6" style={{ fontSize: '10px' }}>{invoice.notes}</p>}

          {/* Fuß: Bankverbindung */}
          {(c.iban || c.bank) && (
            <div
              className="text-zinc-500 mt-12 pt-4"
              style={{ fontSize: '9px', borderTop: '1px solid #e4e4e7' }}
            >
              <div className="font-semibold text-zinc-600 mb-1">Bankverbindung</div>
              {c.bank && <span>{c.bank} · </span>}
              {c.iban && <span>IBAN: {c.iban} · </span>}
              {c.bic && <span>BIC: {c.bic}</span>}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
