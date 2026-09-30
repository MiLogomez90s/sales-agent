import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { LogEntry } from '@/lib/db/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level');
    const category = searchParams.get('category');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let query = supabase
      .from('logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (level) {
      query = query.eq('level', level);
    }
    if (category) {
      query = query.eq('category', category);
    }

    const { data, count, error } = await query;

    if (error) throw new Error(error.message);

    return NextResponse.json({
      logs: (data as LogEntry[]) || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
