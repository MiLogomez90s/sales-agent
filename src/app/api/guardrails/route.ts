import { NextRequest, NextResponse } from 'next/server';
import { createGuardrail, getAllGuardrails, updateGuardrail, deleteGuardrail } from '@/lib/guardrails';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const guardrails = await getAllGuardrails();
    return NextResponse.json({ guardrails });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, config } = body as {
      name: string;
      type: 'max_discount' | 'forbidden_topic' | 'escalation_keyword' | 'max_response_length' | 'require_approval' | 'custom';
      config: Record<string, unknown>;
    };

    if (!name || !type) {
      return NextResponse.json({ error: 'name and type are required' }, { status: 400 });
    }

    const guardrail = await createGuardrail({ name, type, config });
    return NextResponse.json({ guardrail }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('guardrails', `Create error: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
