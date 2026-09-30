import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
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
      is_active?: boolean;
    };

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (api_key !== undefined) updates.api_key = api_key;
    if (base_url !== undefined) updates.base_url = base_url;
    if (models !== undefined) updates.models = models;
    if (is_active !== undefined) updates.is_active = is_active;

    if (Object.keys(updates).length === 1) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { error } = await supabase
      .from('llm_providers')
      .update(updates)
      .eq('id', id);

    if (error) throw new Error(error.message);

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
    const { error } = await supabase
      .from('llm_providers')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);

    logger.info('llm', `Provider deleted: ${id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('llm', `Provider delete error: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
