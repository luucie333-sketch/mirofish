import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT =
  'You are a scenario expansion assistant. Take the user\'s brief prediction question and expand it into a detailed 200-300 word scenario description. Include specific stakeholders (companies, people, organizations), potential impacts, competing viewpoints, and relevant context. Write it as a factual briefing document, not as a question. Do not use markdown formatting. Always write the expanded scenario in English, regardless of the input language.';

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { prompt } = await req.json();
  if (!prompt) {
    return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Graceful fallback — return the original prompt unchanged
    return NextResponse.json({ enriched: prompt });
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    // Graceful fallback — return the original prompt unchanged
    return NextResponse.json({ enriched: prompt });
  }

  const data = await res.json();
  const enriched: string = data.choices?.[0]?.message?.content?.trim() ?? prompt;

  return NextResponse.json({ enriched });
}
