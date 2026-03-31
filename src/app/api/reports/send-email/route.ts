import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

interface EmailStats {
  agents: number;
  rounds: number;
  actions: number;
}

function extractTakeaways(markdown: string): string[] {
  const sections = markdown.split(/^##\s+/m).slice(1);
  return sections
    .slice(0, 3)
    .map((section) => {
      const lines = section.split('\n').slice(1);
      const firstLine = lines.find((l) => l.trim() && !l.startsWith('#') && !l.startsWith('-') && !l.startsWith('>'));
      if (!firstLine) return '';
      const clean = firstLine.replace(/\*\*/g, '').replace(/\*/g, '').trim();
      return clean.split(/[.!?]/)[0].trim();
    })
    .filter(Boolean);
}

function markdownToHtml(md: string): string {
  return md
    .split('\n')
    .map((line) => {
      if (/^### /.test(line)) return `<h3 style="font-size:16px;font-weight:700;color:#1A2744;margin:20px 0 8px;">${line.slice(4)}</h3>`;
      if (/^## /.test(line)) return `<h2 style="font-size:18px;font-weight:700;color:#1A2744;margin:24px 0 10px;border-bottom:1px solid #E8E4DC;padding-bottom:6px;">${line.slice(3)}</h2>`;
      if (/^> /.test(line)) return `<blockquote style="border-left:3px solid #0FA68C;margin:12px 0;padding:8px 16px;background:#F0FAF7;color:#3D4A5C;font-style:italic;">${line.slice(2)}</blockquote>`;
      if (/^- /.test(line)) return `<li style="color:#3D4A5C;margin:4px 0;padding-left:4px;">${line.slice(2).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</li>`;
      if (line.trim() === '') return '<br/>';
      const formatted = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');
      return `<p style="color:#3D4A5C;font-size:15px;line-height:1.7;margin:8px 0;">${formatted}</p>`;
    })
    .join('\n')
    .replace(/(<li[^>]*>.*<\/li>\n?)+/g, (match) => `<ul style="margin:10px 0 10px 20px;padding:0;">${match}</ul>`);
}

function buildEmailHtml(
  title: string,
  markdown: string,
  stats: EmailStats,
  confidence: number,
  takeaways: string[],
): string {
  const confidenceColor = confidence >= 80 ? '#0FA68C' : '#F59E0B';
  const reportHtml = markdownToHtml(markdown.replace(/^#\s+.+\n?/m, '').trim());

  const takeawaysHtml = takeaways.length > 0
    ? `<table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
        <tr>
          <td style="background-color:#E6F7F3;border-left:4px solid #0FA68C;border-radius:0 8px 8px 0;padding:16px 20px;">
            <p style="margin:0 0 10px;font-size:15px;font-weight:700;color:#1A2744;">🎯 Key Takeaways</p>
            <ul style="margin:0;padding:0 0 0 18px;">
              ${takeaways.map((t) => `<li style="color:#3D4A5C;font-size:14px;line-height:1.6;margin-bottom:6px;">${t}.</li>`).join('')}
            </ul>
          </td>
        </tr>
      </table>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Prediction Report</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F2EB;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F2EB;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background-color:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background-color:#0FA68C;padding:32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <h1 style="margin:0;color:#FFFFFF;font-size:26px;font-weight:700;letter-spacing:-0.5px;">🐟 MiroFish</h1>
                    <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:12px;letter-spacing:1px;text-transform:uppercase;">AI Prediction Engine</p>
                  </td>
                  <td align="right" valign="middle">
                    <div style="background:rgba(255,255,255,0.15);border-radius:12px;padding:12px 16px;text-align:center;">
                      <p style="margin:0;color:#FFFFFF;font-size:22px;font-weight:700;">${confidence}%</p>
                      <p style="margin:2px 0 0;color:rgba(255,255,255,0.8);font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">Prediction Confidence</p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td style="padding:32px 40px 0;">
              <p style="margin:0 0 8px;font-size:11px;color:#0FA68C;text-transform:uppercase;letter-spacing:1px;font-family:monospace;">Your Prediction Report</p>
              <h2 style="margin:0 0 24px;color:#1A2744;font-size:22px;font-weight:700;line-height:1.3;">${title}</h2>

              <!-- Stats bar -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="padding-right:10px;">
                    <span style="display:inline-block;padding:6px 14px;background:#EEF2FF;border:1px solid #C7D2FE;border-radius:20px;font-size:12px;color:#4F46E5;font-family:monospace;">👾 ${stats.agents} Agents</span>
                  </td>
                  <td style="padding-right:10px;">
                    <span style="display:inline-block;padding:6px 14px;background:#F0FAF7;border:1px solid #A7F3D0;border-radius:20px;font-size:12px;color:#0FA68C;font-family:monospace;">🔄 ${stats.rounds} Rounds</span>
                  </td>
                  <td>
                    <span style="display:inline-block;padding:6px 14px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:20px;font-size:12px;color:#D97706;font-family:monospace;">⚡ ${stats.actions} Actions</span>
                  </td>
                </tr>
              </table>

              <!-- Confidence note -->
              <p style="margin:0 0 28px;font-size:13px;color:#6B7280;font-family:monospace;">
                Prediction Confidence: <strong style="color:${confidenceColor};">${confidence}%</strong>
              </p>

              ${takeawaysHtml}
            </td>
          </tr>

          <!-- Report content -->
          <tr>
            <td style="padding:0 40px 32px;">
              <hr style="border:none;border-top:1px solid #E8E4DC;margin:0 0 24px;" />
              ${reportHtml}
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" style="padding:0 40px 32px;">
              <hr style="border:none;border-top:1px solid #E8E4DC;margin:0 0 28px;" />
              <p style="margin:0 0 16px;color:#3D4A5C;font-size:15px;">Want to run more predictions?</p>
              <a href="https://mirofish.us/chat"
                 style="display:inline-block;background-color:#0FA68C;color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:700;padding:14px 32px;border-radius:10px;letter-spacing:0.3px;">
                Run Another Prediction
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:0 40px 32px;">
              <p style="margin:0;color:#9AA3AE;font-size:12px;line-height:1.6;">
                You&rsquo;re receiving this because you ran a simulation at MiroFish.<br />
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

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });

  const { markdown_content, title, stats } = await request.json() as {
    markdown_content: string;
    title: string;
    stats: EmailStats;
  };

  const confidence = Math.min(95, Math.round(60 + (stats.agents * 2) + (stats.rounds * 0.5) + (stats.actions * 0.05)));
  const takeaways = extractTakeaways(markdown_content);
  const html = buildEmailHtml(title, markdown_content, stats, confidence, takeaways);

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'MiroFish <noreply@mirofish.us>',
      to: [user.email],
      subject: `Your Prediction Report: ${title}`,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return NextResponse.json({ error: (err as { message?: string }).message ?? 'Failed to send email' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
