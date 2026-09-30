import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { AgentConfig } from '@/lib/db/types';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('agent_config')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ config: data as AgentConfig });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { system_prompt, model, temperature, max_tokens, language } = body as Partial<AgentConfig>;

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (system_prompt !== undefined) updates.system_prompt = system_prompt;
    if (model !== undefined) updates.model = model;
    if (temperature !== undefined) updates.temperature = temperature;
    if (max_tokens !== undefined) updates.max_tokens = max_tokens;
    if (language !== undefined) updates.language = language;

    if (Object.keys(updates).length === 1) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('agent_config')
      .update(updates)
      .eq('id', 1)
      .select()
      .single();

    if (error) throw new Error(error.message);
    logger.info('config', 'Agent config updated', { fields: Object.keys(body) });
    return NextResponse.json({ config: data as AgentConfig });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('config', `Config update error: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
