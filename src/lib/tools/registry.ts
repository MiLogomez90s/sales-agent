import { getDb, prepare } from '@/lib/db';
import { Tool, ToolConfig } from '@/lib/db/types';
import { LLMToolDefinition } from '@/lib/llm/types';
import { isHttpConfig } from './executor';

export async function getActiveTools(): Promise<Tool[]> {
  const stmt = await prepare('SELECT * FROM tools WHERE is_active = 1 ORDER BY created_at ASC');
  return (await stmt.all()) as Tool[];
}

export async function getAllTools(): Promise<Tool[]> {
  const stmt = await prepare('SELECT * FROM tools ORDER BY created_at ASC');
  return (await stmt.all()) as Tool[];
}

export async function getToolById(id: string): Promise<Tool | null> {
  const stmt = await prepare('SELECT * FROM tools WHERE id = ?');
  return ((await stmt.get(id)) as Tool) || null;
}

export async function createTool(
  name: string,
  description: string,
  type: 'http' | 'webhook',
  config: ToolConfig
): Promise<Tool> {
  const id = `tool_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const stmt = await prepare(
    'INSERT INTO tools (id, name, description, type, config) VALUES (?, ?, ?, ?, ?)'
  );
  await stmt.run(id, name, description, type, JSON.stringify(config));

  return (await getToolById(id))!;
}

export async function updateTool(
  id: string,
  updates: {
    name?: string;
    description?: string;
    type?: 'http' | 'webhook';
    config?: ToolConfig;
    is_active?: number;
  }
): Promise<Tool | null> {
  const tool = await getToolById(id);
  if (!tool) return null;

  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
  if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
  if (updates.type !== undefined) { fields.push('type = ?'); values.push(updates.type); }
  if (updates.config !== undefined) { fields.push('config = ?'); values.push(JSON.stringify(updates.config)); }
  if (updates.is_active !== undefined) { fields.push('is_active = ?'); values.push(updates.is_active); }

  if (fields.length === 0) return tool;

  fields.push("updated_at = datetime('now')");
  values.push(id);

  const stmt = await prepare(`UPDATE tools SET ${fields.join(', ')} WHERE id = ?`);
  await stmt.run(...values);
  return getToolById(id);
}

export async function deleteTool(id: string): Promise<boolean> {
  const stmt = await prepare('DELETE FROM tools WHERE id = ?');
  const result = await stmt.run(id);
  return result.changes > 0;
}

export async function toolsToLLMDefinitions(tools: Tool[]): Promise<LLMToolDefinition[]> {
  return tools
    .filter((t) => t.is_active === 1)
    .filter((t) => {
      const config = JSON.parse(t.config) as ToolConfig;
      return isHttpConfig(config);
    })
    .map((tool) => {
      const config = JSON.parse(tool.config) as ToolConfig;
      const httpConfig = config as { url: string };

      return {
        type: 'function' as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: {
            type: 'object' as const,
            properties: extractUrlParams(httpConfig.url),
            required: [],
          },
        },
      };
    });
}

function extractUrlParams(url: string): Record<string, { type: string; description: string }> {
  const params: Record<string, { type: string; description: string }> = {};
  const regex = /\{\{(\w+)\}\}/g;
  let match;
  while ((match = regex.exec(url)) !== null) {
    params[match[1]] = { type: 'string', description: `Value for ${match[1]}` };
  }
  return params;
}
