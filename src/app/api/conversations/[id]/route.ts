import { NextRequest, NextResponse } from 'next/server';
import { getConversationMessages, deleteConversation } from '@/lib/agent/engine';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const messages = await getConversationMessages(id);
    return NextResponse.json({ messages });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const deleted = await deleteConversation(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
