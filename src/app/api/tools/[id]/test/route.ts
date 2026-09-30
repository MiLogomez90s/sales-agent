import { NextRequest, NextResponse } from 'next/server';
import { getToolById } from '@/lib/tools/registry';
import { executeHttpTool, isHttpConfig } from '@/lib/tools/executor';
import { logger } from '@/lib/logger';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const tool = await getToolById(id);

    if (!tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }

    const config = tool.config as unknown as import('@/lib/db/types').ToolConfig;
    if (!isHttpConfig(config)) {
      return NextResponse.json(
        { error: 'Only HTTP tools can be tested directly' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { parameters } = body as { parameters?: Record<string, unknown> };

    logger.info('tools', `Testing tool: ${tool.name}`, { parameters });
    const result = await executeHttpTool(config, parameters || {});

    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('tools', `Tool test error: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
