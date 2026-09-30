import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { LlmProvider } from '@/lib/db/types';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('llm_providers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    // Don't expose API keys in list
    const sanitized = ((data as LlmProvider[]) || []).map((p) => ({ ...p, api_key: '***' }));
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

    const { error } = await supabase
      .from('llm_providers')
      .insert({
        id,
        name,
        api_key,
        base_url: base_url || 'https://openrouter.ai/api/v1',
        models: models || [],
      });

    if (error) throw new Error(error.message);

    logger.info('llm', `Provider created: ${name}`);
    return NextResponse.json({ id, name }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('llm', `Provider creation error: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
