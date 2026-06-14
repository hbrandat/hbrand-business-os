import { NextResponse } from 'next/server'
import { createToken, cookieOptions, SESSION_COOKIE } from '@/lib/auth'

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({ password: '' }))
  const expected = process.env.APP_PASSWORD

  if (!expected) {
    return NextResponse.json(
      { error: 'Server nicht konfiguriert (APP_PASSWORD fehlt)' },
      { status: 500 }
    )
  }
  if (!password || password !== expected) {
    return NextResponse.json({ error: 'Falsches Passwort' }, { status: 401 })
  }

  const token = await createToken()
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, token, cookieOptions())
  return res
}
