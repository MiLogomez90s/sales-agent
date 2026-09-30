import { NextRequest, NextResponse } from 'next/server';
import { updateGuardrail, deleteGuardrail } from '@/lib/guardrails';
import { logger } from '@/lib/logger';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, type, config, is_active } = body as {
      name?: string;
      type?: 'max_discount' | 'forbidden_topic' | 'escalation_keyword' | 'max_response_length' | 'require_approval' | 'custom';
      config?: Record<string, unknown>;
      is_active?: boolean;
    };

    const guardrail = await updateGuardrail(id, { name, type, config, is_active });
    if (!guardrail) {
      return NextResponse.json({ error: 'Guardrail not found' }, { status: 404 });
    }

    return NextResponse.json({ guardrail });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('guardrails', `Update error: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const deleted = await deleteGuardrail(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Guardrail not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('guardrails', `Delete error: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
