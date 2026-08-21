import { NextResponse } from 'next/server';
import { Resend } from 'resend';

import { site } from '@/content/site';

export const dynamic = 'force-dynamic';

/** Deliberately loose, same rule the form itself uses. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const { name, email, message } = body as Record<string, unknown>;
  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Please add your name.' }, { status: 400 });
  }
  if (typeof email !== 'string' || !EMAIL.test(email.trim())) {
    return NextResponse.json({ error: 'That email does not look right.' }, { status: 400 });
  }
  if (typeof message !== 'string' || !message.trim()) {
    return NextResponse.json({ error: 'Please add a message.' }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Fails loudly in the response rather than pretending to have sent it —
    // a silently-dropped inquiry is worse than a visible error.
    return NextResponse.json({ error: 'Email is not set up yet — try again later.' }, { status: 503 });
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    // The default Resend sending address works with no domain setup. Once
    // d-craft.dev is verified in the Resend dashboard, this can become
    // something like `D_craft <inquiries@d-craft.dev>` instead.
    from: 'D_craft <onboarding@resend.dev>',
    to: site.email,
    replyTo: email.trim(),
    subject: `Portfolio inquiry — ${name.trim()}`,
    text: `${message.trim()}\n\n—\n${name.trim()}\n${email.trim()}`,
  });

  if (error) {
    return NextResponse.json({ error: 'Could not send that — try again in a moment.' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
