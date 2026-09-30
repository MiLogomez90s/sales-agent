import { NextRequest, NextResponse } from 'next/server';
import { runAgent, getConversations, getConversationMessages, deleteConversation } from '@/lib/agent/engine';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, conversationId } = body as { message: string; conversationId?: string };

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of runAgent(message, conversationId)) {
            const chunk = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(chunk));
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          logger.error('api', `Chat stream error: ${message}`);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', data: message })}\n\n`)
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('api', `Chat POST error: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const conversations = await getConversations();
    return NextResponse.json({ conversations });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
