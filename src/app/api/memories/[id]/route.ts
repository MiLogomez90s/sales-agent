import { NextRequest, NextResponse } from 'next/server';
import { updateMemory, deleteMemory, getMemoryById } from '@/lib/memory';
import { logger } from '@/lib/logger';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { category, key, value, metadata } = body as {
      category?: string;
      key?: string;
      value?: string;
      metadata?: Record<string, unknown> | null;
    };

    const memory = await updateMemory(id, { category, key, value, metadata });
    if (!memory) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }

    return NextResponse.json({ memory });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('memories', `Update error: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const deleted = await deleteMemory(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('memories', `Delete error: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
