import { NextRequest, NextResponse } from 'next/server';
import { getTemplateById } from '@/lib/tools/templates';
import { createTool } from '@/lib/tools/registry';
import { logger } from '@/lib/logger';

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const template = getTemplateById(id);

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const tool = await createTool(
      template.defaultName,
      template.defaultDescription,
      template.type,
      template.config
    );

    logger.info('tools', `Tool created from template: ${template.name}`, { toolId: tool.id });
    return NextResponse.json({ tool }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('tools', `Template instantiate error: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
