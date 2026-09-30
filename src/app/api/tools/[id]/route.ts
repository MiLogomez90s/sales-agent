import { NextRequest, NextResponse } from 'next/server';
import { updateTool, deleteTool, getToolById } from '@/lib/tools/registry';
import { validateToolConfig } from '@/lib/tools/executor';
import { ToolConfig } from '@/lib/db/types';
import { logger } from '@/lib/logger';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, type, config, is_active } = body as {
      name?: string;
      description?: string;
      type?: 'http' | 'webhook';
      config?: ToolConfig;
      is_active?: number;
    };

    if (config) {
      const errors = validateToolConfig(config);
      if (errors.length > 0) {
        return NextResponse.json({ error: errors.join(', ') }, { status: 400 });
      }
    }

    const tool = await updateTool(id, { name, description, type, config, is_active });
    if (!tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }

    logger.info('tools', `Tool updated: ${id}`);
    return NextResponse.json({ tool });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('tools', `Tool update error: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const deleted = await deleteTool(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }

    logger.info('tools', `Tool deleted: ${id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('tools', `Tool delete error: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
