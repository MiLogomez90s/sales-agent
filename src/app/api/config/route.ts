import { NextRequest, NextResponse } from 'next/server';
import { getDb, prepare } from '@/lib/db';
import { AgentConfig } from '@/lib/db/types';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const stmt = await prepare('SELECT * FROM agent_config WHERE id = 1');
    const config = (await stmt.get()) as AgentConfig;
    return NextResponse.json({ config });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { system_prompt, model, temperature, max_tokens, language } = body as Partial<AgentConfig>;

    const fields: string[] = [];
    const values: unknown[] = [];

    if (system_prompt !== undefined) { fields.push('system_prompt = ?'); values.push(system_prompt); }
    if (model !== undefined) { fields.push('model = ?'); values.push(model); }
    if (temperature !== undefined) { fields.push('temperature = ?'); values.push(temperature); }
    if (max_tokens !== undefined) { fields.push('max_tokens = ?'); values.push(max_tokens); }
    if (language !== undefined) { fields.push('language = ?'); values.push(language); }

    if (fields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    fields.push("updated_at = datetime('now')");

    const stmt = await prepare(`UPDATE agent_config SET ${fields.join(', ')} WHERE id = 1`);
    await stmt.run(...values);

    const selectStmt = await prepare('SELECT * FROM agent_config WHERE id = 1');
    const config = (await selectStmt.get()) as AgentConfig;
    logger.info('config', 'Agent config updated', { fields: Object.keys(body) });
    return NextResponse.json({ config });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('config', `Config update error: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
