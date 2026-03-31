import { createClient, createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  return data?.role === 'admin' ? user : null;
}

function buildEmailHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your prediction is waiting</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F2EB;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F2EB;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td align="center" style="background-color:#0FA68C;padding:32px 40px;">
              <h1 style="margin:0;color:#FFFFFF;font-size:28px;font-weight:700;letter-spacing:-0.5px;">🐟 MiroFish</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;letter-spacing:1px;text-transform:uppercase;">AI Prediction Engine</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h2 style="margin:0 0 16px;color:#1A2744;font-size:22px;font-weight:700;line-height:1.3;">
                Your prediction is waiting 🐟
              </h2>
              <p style="margin:0 0 24px;color:#3D4A5C;font-size:16px;line-height:1.7;">
                Hey there! You used your free prediction credit on MiroFish &mdash; but there&rsquo;s so much more to explore.
              </p>
              <p style="margin:0 0 32px;color:#3D4A5C;font-size:16px;line-height:1.7;">
                Unlock unlimited AI predictions for just <strong style="color:#1A2744;">$29.99/month</strong>, or grab <strong style="color:#1A2744;">10 credits for $2.99</strong>.
              </p>

              <!-- CTA Buttons -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom:12px;">
                    <a href="https://mirofish.us/chat"
                       style="display:inline-block;background-color:#0FA68C;color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:700;padding:14px 32px;border-radius:10px;letter-spacing:0.3px;">
                      Get Unlimited &mdash; $29.99/mo
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <a href="https://mirofish.us/chat"
                       style="display:inline-block;background-color:#FFFFFF;color:#0FA68C;text-decoration:none;font-size:15px;font-weight:700;padding:13px 32px;border-radius:10px;border:2px solid #0FA68C;letter-spacing:0.3px;">
                      Buy 10 Credits &mdash; $2.99
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Tagline -->
          <tr>
            <td align="center" style="padding:0 40px 32px;">
              <p style="margin:0;color:#0FA68C;font-size:15px;font-style:italic;font-weight:600;">
                What will you predict next?
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <hr style="border:none;border-top:1px solid #E8E4DC;margin:0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:24px 40px 32px;">
              <p style="margin:0;color:#9AA3AE;font-size:12px;line-height:1.6;">
                You&rsquo;re receiving this because you signed up at MiroFish.<br />
                <a href="https://mirofish.us" style="color:#9AA3AE;text-decoration:underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
  }

  const service = createServiceClient();
  const { data: users, error } = await service
    .from('users')
    .select('id, email')
    .eq('credits', 0)
    .neq('role', 'admin');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!users || users.length === 0) return NextResponse.json({ sent: 0 });

  const batch = users.slice(0, 50);
  const html = buildEmailHtml();
  let sent = 0;

  for (const user of batch) {
    if (!user.email) continue;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'MiroFish <noreply@mirofish.us>',
        to: [user.email],
        subject: 'Your prediction is waiting 🐟',
        html,
      }),
    });

    if (res.ok) sent++;

    await sleep(200);
  }

  return NextResponse.json({ sent });
}
