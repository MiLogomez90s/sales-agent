import { supabase } from '@/lib/db';
import { logger } from '@/lib/logger';

export interface Memory {
  id: string;
  category: string;
  key: string;
  value: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface MemoryInput {
  category?: string;
  key: string;
  value: string;
  metadata?: Record<string, unknown>;
}

export async function createMemory(input: MemoryInput): Promise<Memory> {
  const id = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const { data, error } = await supabase
    .from('memories')
    .insert({
      id,
      category: input.category || 'general',
      key: input.key,
      value: input.value,
      metadata: input.metadata || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  logger.debug('memory', `Memory created: ${input.key}`, { category: input.category });
  return data as Memory;
}

export async function getMemoryById(id: string): Promise<Memory | null> {
  const { data } = await supabase
    .from('memories')
    .select('*')
    .eq('id', id)
    .single();
  return (data as Memory) || null;
}

export async function getMemories(category?: string, limit = 100): Promise<Memory[]> {
  let query = supabase
    .from('memories')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (category) {
    query = query.eq('category', category);
  }

  const { data } = await query;
  return (data as Memory[]) || [];
}

export async function searchMemories(query: string, limit = 20): Promise<Memory[]> {
  const { data } = await supabase
    .from('memories')
    .select('*')
    .or(`key.ilike.%${query}%,value.ilike.%${query}%,category.ilike.%${query}%`)
    .order('updated_at', { ascending: false })
    .limit(limit);
  return (data as Memory[]) || [];
}

export async function updateMemory(
  id: string,
  updates: {
    category?: string;
    key?: string;
    value?: string;
    metadata?: Record<string, unknown> | null;
  }
): Promise<Memory | null> {
  const { data, error } = await supabase
    .from('memories')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Memory;
}

export async function deleteMemory(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('memories')
    .delete()
    .eq('id', id);
  return !error;
}

export async function getMemoryCategories(): Promise<string[]> {
  const { data } = await supabase
    .from('memories')
    .select('category');
  const categories = (data as Array<{ category: string }>) || [];
  return [...new Set(categories.map((c) => c.category))];
}

export function formatMemoriesForPrompt(memories: Memory[]): string {
  if (memories.length === 0) return '';

  const lines = memories.map((m) => `- [${m.category}] ${m.key}: ${m.value}`);
  return `\n\n## Memoria del agente (usa esta información para personalizar la conversación):\n${lines.join('\n')}`;
}

export async function getRelevantMemories(conversationText: string, limit = 10): Promise<Memory[]> {
  const words = conversationText
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 10);

  if (words.length === 0) return [];

  const allMatches: Memory[] = [];
  const seen = new Set<string>();

  for (const word of words) {
    const matches = await searchMemories(word, 5);
    for (const match of matches) {
      if (!seen.has(match.id)) {
        seen.add(match.id);
        allMatches.push(match);
      }
    }
    if (allMatches.length >= limit) break;
  }

  return allMatches.slice(0, limit);
}
