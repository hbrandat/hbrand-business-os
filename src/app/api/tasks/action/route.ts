import { NextRequest, NextResponse } from 'next/server'
import { svc } from '@/lib/engine'

// Aufgaben-Aktionen vom Chef. Body: { action, taskId?, ... }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as any
    const db = svc()

    if (body.action === 'create') {
      // Neue Aufgabe auf den Tisch eines Mitarbeiters legen
      const { data: emp } = await db.from('employees').select('id').eq('key', body.employeeKey).single()
      if (!emp) return NextResponse.json({ error: 'Mitarbeiter nicht gefunden' }, { status: 404 })
      const { data: task, error } = await db.from('tasks').insert({
        assignee: emp.id,
        title: body.title,
        brief: body.brief || '',
        customer_id: body.customerId || null,
        order_id: body.orderId || null,
        priority: body.priority || 'normal',
        needs_approval: body.needsApproval !== false,
        status: 'inbox',
      }).select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, task })
    }

    if (body.action === 'approve') {
      // Chef gibt Ergebnis frei. Optional Handoff an nächsten Mitarbeiter.
      const { data: task } = await db.from('tasks').select('*').eq('id', body.taskId).single()
      if (!task) return NextResponse.json({ error: 'Aufgabe nicht gefunden' }, { status: 404 })

      let handoffId: string | null = null
      if (body.handoffTo) {
        const { data: next } = await db.from('employees').select('id').eq('key', body.handoffTo).single()
        handoffId = next?.id ?? null
      }

      await db.from('tasks').update({ status: handoffId ? 'handoff' : 'approved' }).eq('id', body.taskId)

      // Bei Handoff: neue Aufgabe für nächsten Mitarbeiter erzeugen
      if (handoffId) {
        await db.from('tasks').insert({
          assignee: handoffId,
          created_by: task.assignee,
          customer_id: task.customer_id,
          order_id: task.order_id,
          title: body.handoffTitle || `Weiterführung: ${task.title}`,
          brief: body.handoffBrief || task.result || task.brief,
          priority: task.priority,
          needs_approval: true,
          status: 'inbox',
        })
      }
      return NextResponse.json({ ok: true })
    }

    if (body.action === 'reject') {
      await db.from('tasks').update({ status: 'cancelled', error: body.reason || 'Vom Chef abgelehnt' }).eq('id', body.taskId)
      return NextResponse.json({ ok: true })
    }

    if (body.action === 'delete') {
      await db.from('tasks').delete().eq('id', body.taskId)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unbekannte Aktion' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Fehler' }, { status: 500 })
  }
}
