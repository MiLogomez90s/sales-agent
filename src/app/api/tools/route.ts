import { NextRequest, NextResponse } from 'next/server';
import { getAllTools, createTool } from '@/lib/tools/registry';
import { validateToolConfig } from '@/lib/tools/executor';
import { ToolConfig } from '@/lib/db/types';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const tools = await getAllTools();
    return NextResponse.json({ tools });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, type, config } = body as {
      name: string;
      description: string;
      type: 'http' | 'webhook';
      config: ToolConfig;
    };

    if (!name || !description || !type || !config) {
      return NextResponse.json(
        { error: 'name, description, type, and config are required' },
        { status: 400 }
      );
    }

    const errors = validateToolConfig(config);
    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(', ') }, { status: 400 });
    }

    const tool = await createTool(name, description, type, config);
    logger.info('tools', `Tool created: ${name}`, { type });
    return NextResponse.json({ tool }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('tools', `Tool creation error: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
