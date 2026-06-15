/**
 * hBrand E-Mail-Versand
 * Nutzt Google Workspace SMTP (alexander@hbrand.at) via nodemailer.
 *
 * .env.local:
 *   SMTP_USER=alexander@hbrand.at
 *   SMTP_PASS=<Google App-Passwort>  (Google-Konto → Sicherheit → App-Passwörter)
 */

export type EmailOptions = {
  to: string
  subject: string
  text: string
  html?: string
}

export type EmailResult = {
  ok: boolean
  error?: string
  preview?: string   // Falls kein SMTP: E-Mail-Text zur manuellen Kontrolle
}

export async function sendEmail(opts: EmailOptions): Promise<EmailResult> {
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!user || !pass) {
    // Kein SMTP konfiguriert → nur loggen, nicht werfen
    console.warn('[hBrand Email] SMTP_USER/SMTP_PASS fehlen. E-Mail nicht gesendet.')
    console.warn(`[hBrand Email] An: ${opts.to} | Betreff: ${opts.subject}`)
    console.warn(`[hBrand Email] Text:\n${opts.text.slice(0, 500)}`)
    return {
      ok: false,
      error: 'SMTP nicht konfiguriert (SMTP_USER + SMTP_PASS in .env.local setzen)',
      preview: opts.text,
    }
  }

  try {
    // nodemailer dynamisch laden (nur serverseitig)
    const nodemailer = await import('nodemailer')
    const transporter = nodemailer.default.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user, pass },
    })

    await transporter.sendMail({
      from: `hBrand.at <${user}>`,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html ?? opts.text.replace(/\n/g, '<br>'),
    })

    return { ok: true }
  } catch (e: any) {
    console.error('[hBrand Email] Sendefehler:', e.message)
    return { ok: false, error: e.message }
  }
}
