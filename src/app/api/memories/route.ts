import { NextRequest, NextResponse } from 'next/server';
import { createMemory, getMemories, searchMemories, updateMemory, deleteMemory, getMemoryCategories } from '@/lib/memory';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const query = searchParams.get('query') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500);

    if (query) {
      const memories = await searchMemories(query, limit);
      return NextResponse.json({ memories });
    }

    const memories = await getMemories(category, limit);
    const categories = await getMemoryCategories();
    return NextResponse.json({ memories, categories });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, key, value, metadata } = body as {
      category?: string;
      key: string;
      value: string;
      metadata?: Record<string, unknown>;
    };

    if (!key || !value) {
      return NextResponse.json({ error: 'key and value are required' }, { status: 400 });
    }

    const memory = await createMemory({ category, key, value, metadata });
    return NextResponse.json({ memory }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('memories', `Create error: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
