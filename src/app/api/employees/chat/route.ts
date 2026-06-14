import { NextRequest, NextResponse } from 'next/server'
import { svc, callLLM, logAiJob } from '@/lib/engine'

export const maxDuration = 60

// Chat mit einem Mitarbeiter. Body: { employeeKey, message, history? }
export async function POST(req: NextRequest) {
  const t0 = Date.now()
  try {
    const { employeeKey, message, history } = await req.json() as {
      employeeKey: string; message: string
      history?: { role: 'chef' | 'employee'; text: string }[]
    }
    if (!employeeKey || !message) return NextResponse.json({ error: 'employeeKey und message erforderlich' }, { status: 400 })

    const db = svc()
    const { data: emp } = await db.from('employees').select('*').eq('key', employeeKey).single()
    if (!emp) return NextResponse.json({ error: 'Mitarbeiter nicht gefunden' }, { status: 404 })

    const convo = (history || []).map(h => `${h.role === 'chef' ? 'CHEF' : emp.name.toUpperCase()}: ${h.text}`).join('\n')
    const userContent = `${convo ? convo + '\n' : ''}CHEF: ${message}\n\nAntworte als ${emp.name} in deiner Rolle. Knapp und konkret.`

    const result = await callLLM(emp.model || 'claude-sonnet-4', emp.system_prompt, userContent, 2048)

    await logAiJob({
      employee_key: emp.key, model: result.model,
      input_tokens: result.input_tokens, output_tokens: result.output_tokens,
      cost_usd: result.cost_usd, duration_ms: Date.now() - t0, status: 'completed',
      prompt_summary: `Chat: ${message.slice(0, 100)}`, result_summary: result.text.slice(0, 200),
    })

    return NextResponse.json({ reply: result.text, cost_usd: result.cost_usd })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Fehler' }, { status: 500 })
  }
}
