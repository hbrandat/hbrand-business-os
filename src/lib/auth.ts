// Schlanke Single-User-Auth: HMAC-signiertes Session-Cookie (Edge-kompatibel).
// Kein DB-Zugriff, kein NextAuth — nur ein Passwort (APP_PASSWORD) + Secret (NEXTAUTH_SECRET).

export const SESSION_COOKIE = 'hb_session'
const MAX_AGE_SEC = 60 * 60 * 24 * 30 // 30 Tage

function secret(): string {
  return process.env.NEXTAUTH_SECRET || 'dev-insecure-secret-change-me'
}

function b64url(bytes: ArrayBuffer): string {
  let bin = ''
  const arr = new Uint8Array(bytes)
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  return b64url(sig)
}

// Token-Format: "<expiryMs>.<hmac(expiryMs)>"
export async function createToken(): Promise<string> {
  const expiry = String(Date.now() + MAX_AGE_SEC * 1000)
  const sig = await hmac(expiry)
  return `${expiry}.${sig}`
}

export async function verifyToken(token: string | undefined): Promise<boolean> {
  if (!token) return false
  const [expiry, sig] = token.split('.')
  if (!expiry || !sig) return false
  if (Number(expiry) < Date.now()) return false
  const expected = await hmac(expiry)
  if (sig.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: MAX_AGE_SEC,
  }
}
