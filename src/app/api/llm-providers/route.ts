import { NextRequest, NextResponse } from 'next/server';
import { prepare } from '@/lib/db';
import { LlmProvider } from '@/lib/db/types';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const stmt = await prepare('SELECT * FROM llm_providers ORDER BY created_at DESC');
    const providers = (await stmt.all()) as LlmProvider[];
    // Don't expose API keys in list
    const sanitized = providers.map((p) => ({ ...p, api_key: '***' }));
    return NextResponse.json({ providers: sanitized });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, api_key, base_url, models } = body as {
      name: string;
      api_key: string;
      base_url?: string;
      models?: string[];
    };

    if (!name || !api_key) {
      return NextResponse.json({ error: 'name and api_key are required' }, { status: 400 });
    }

    const id = `provider_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const stmt = await prepare(
      'INSERT INTO llm_providers (id, name, api_key, base_url, models) VALUES (?, ?, ?, ?, ?)'
    );
    await stmt.run(id, name, api_key, base_url || 'https://openrouter.ai/api/v1', JSON.stringify(models || []));

    logger.info('llm', `Provider created: ${name}`);
    return NextResponse.json({ id, name }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('llm', `Provider creation error: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
