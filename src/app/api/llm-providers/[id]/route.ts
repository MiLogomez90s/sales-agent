import { NextRequest, NextResponse } from 'next/server';
import { prepare } from '@/lib/db';
import { logger } from '@/lib/logger';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, api_key, base_url, models, is_active } = body as {
      name?: string;
      api_key?: string;
      base_url?: string;
      models?: string[];
      is_active?: number;
    };

    const fields: string[] = [];
    const values: unknown[] = [];

    if (name !== undefined) { fields.push('name = ?'); values.push(name); }
    if (api_key !== undefined) { fields.push('api_key = ?'); values.push(api_key); }
    if (base_url !== undefined) { fields.push('base_url = ?'); values.push(base_url); }
    if (models !== undefined) { fields.push('models = ?'); values.push(JSON.stringify(models)); }
    if (is_active !== undefined) { fields.push('is_active = ?'); values.push(is_active); }

    if (fields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    fields.push("updated_at = datetime('now')");
    values.push(id);

    const stmt = await prepare(`UPDATE llm_providers SET ${fields.join(', ')} WHERE id = ?`);
    await stmt.run(...values);

    logger.info('llm', `Provider updated: ${id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('llm', `Provider update error: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const stmt = await prepare('DELETE FROM llm_providers WHERE id = ?');
    const result = await stmt.run(id);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    logger.info('llm', `Provider deleted: ${id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('llm', `Provider delete error: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
