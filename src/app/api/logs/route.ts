import { NextRequest, NextResponse } from 'next/server';
import { prepare } from '@/lib/db';
import { LogEntry } from '@/lib/db/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level');
    const category = searchParams.get('category');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const conditions: string[] = [];
    const values: unknown[] = [];

    if (level) {
      conditions.push('level = ?');
      values.push(level);
    }
    if (category) {
      conditions.push('category = ?');
      values.push(category);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const logStmt = await prepare(`SELECT * FROM logs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`);
    const logs = (await logStmt.all(...values, limit, offset)) as LogEntry[];

    const countStmt = await prepare(`SELECT COUNT(*) as count FROM logs ${where}`);
    const countResult = (await countStmt.get(...values)) as { count: number };
    const total = countResult.count;

    return NextResponse.json({ logs, total, limit, offset });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
