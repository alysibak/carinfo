/**
 * Account email: password reset links and address confirmation, sent through
 * Resend's HTTP API (https://resend.com). Without RESEND_API_KEY and
 * EMAIL_FROM the site offers neither, and says so: sign-in still works, a
 * forgotten password needs Google sign-in, and an address stays unconfirmed.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

type Sender = (message: EmailMessage) => Promise<void>;

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());
}

const resend: Sender = async (message) => {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM!.trim(),
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Resend answered ${res.status}: ${await res.text()}`);
};

let sender: Sender = resend;

/** Test seam: capture messages instead of calling Resend. */
export function __setEmailSenderForTests(fn: Sender | null): void {
  sender = fn ?? resend;
}

/** One link, one line of context. The link is the only variable part. */
function linkEmail(to: string, subject: string, intro: string, action: string, url: string) {
  const href = url.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  return sender({
    to,
    subject,
    text: `${intro}\n\n${action}: ${url}\n\nIf you did not ask for this, ignore this email.`,
    html:
      `<p>${intro}</p>` +
      `<p><a href="${href}">${action}</a></p>` +
      `<p style="color:#666">If you did not ask for this, ignore this email.</p>`,
  });
}

export function sendPasswordResetEmail(to: string, url: string): Promise<void> {
  return linkEmail(
    to,
    'Reset your CarInfo password',
    'Someone, hopefully you, asked to reset the password for this CarInfo account. The link works for one hour.',
    'Choose a new password',
    url,
  );
}

export function sendVerificationEmail(to: string, url: string): Promise<void> {
  return linkEmail(
    to,
    'Confirm your CarInfo email',
    'Confirm this address to finish setting up your CarInfo account.',
    'Confirm email',
    url,
  );
}
