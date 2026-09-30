import { NextRequest, NextResponse } from 'next/server';
import { getToolById } from '@/lib/tools/registry';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/db';

type Params = { params: Promise<{ toolId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { toolId } = await params;
    const tool = await getToolById(toolId);

    if (!tool) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const headers = Object.fromEntries(request.headers.entries());

    logger.info('webhook', `Incoming webhook: ${tool.name}`, {
      toolId,
      body: JSON.stringify(body).slice(0, 500),
    });

    // Store the webhook payload as a log entry for the agent to process
    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: 'webhook_inbox',
        role: 'tool',
        content: JSON.stringify({ tool: tool.name, payload: body, headers, received_at: new Date().toISOString() }),
      });

    if (error) throw new Error(error.message);

    return NextResponse.json({
      success: true,
      message: `Webhook received for ${tool.name}`,
      received_at: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('webhook', `Webhook error: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
