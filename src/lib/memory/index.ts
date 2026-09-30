import { getDb, prepare } from '@/lib/db';
import { logger } from '@/lib/logger';

export interface Memory {
  id: string;
  category: string;
  key: string;
  value: string;
  metadata: string | null;
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

  const stmt = await prepare(
    'INSERT INTO memories (id, category, key, value, metadata) VALUES (?, ?, ?, ?, ?)'
  );
  await stmt.run(
    id,
    input.category || 'general',
    input.key,
    input.value,
    input.metadata ? JSON.stringify(input.metadata) : null
  );

  logger.debug('memory', `Memory created: ${input.key}`, { category: input.category });
  return (await getMemoryById(id))!;
}

export async function getMemoryById(id: string): Promise<Memory | null> {
  const stmt = await prepare('SELECT * FROM memories WHERE id = ?');
  return ((await stmt.get(id)) as Memory) || null;
}

export async function getMemories(category?: string, limit = 100): Promise<Memory[]> {
  if (category) {
    const stmt = await prepare('SELECT * FROM memories WHERE category = ? ORDER BY updated_at DESC LIMIT ?');
    return (await stmt.all(category, limit)) as Memory[];
  }
  const stmt = await prepare('SELECT * FROM memories ORDER BY updated_at DESC LIMIT ?');
  return (await stmt.all(limit)) as Memory[];
}

export async function searchMemories(query: string, limit = 20): Promise<Memory[]> {
  const pattern = `%${query}%`;
  const stmt = await prepare(
    `SELECT * FROM memories
     WHERE key LIKE ? OR value LIKE ? OR category LIKE ?
     ORDER BY updated_at DESC LIMIT ?`
  );
  return (await stmt.all(pattern, pattern, pattern, limit)) as Memory[];
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
  const memory = await getMemoryById(id);
  if (!memory) return null;

  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.category !== undefined) { fields.push('category = ?'); values.push(updates.category); }
  if (updates.key !== undefined) { fields.push('key = ?'); values.push(updates.key); }
  if (updates.value !== undefined) { fields.push('value = ?'); values.push(updates.value); }
  if (updates.metadata !== undefined) {
    fields.push('metadata = ?');
    values.push(updates.metadata ? JSON.stringify(updates.metadata) : null);
  }

  if (fields.length === 0) return memory;

  fields.push("updated_at = datetime('now')");
  values.push(id);

  const stmt = await prepare(`UPDATE memories SET ${fields.join(', ')} WHERE id = ?`);
  await stmt.run(...values);
  return getMemoryById(id);
}

export async function deleteMemory(id: string): Promise<boolean> {
  const stmt = await prepare('DELETE FROM memories WHERE id = ?');
  const result = await stmt.run(id);
  return result.changes > 0;
}

export async function getMemoryCategories(): Promise<string[]> {
  const stmt = await prepare('SELECT DISTINCT category FROM memories');
  const rows = (await stmt.all()) as Array<{ category: string }>;
  return rows.map((r) => r.category);
}

export function formatMemoriesForPrompt(memories: Memory[]): string {
  if (memories.length === 0) return '';

  const lines = memories.map((m) => `- [${m.category}] ${m.key}: ${m.value}`);
  return `\n\n## Memoria del agente (usa esta información para personalizar la conversación):\n${lines.join('\n')}`;
}

export async function getRelevantMemories(conversationText: string, limit = 10): Promise<Memory[]> {
  // Simple relevance: extract words from conversation and search
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
