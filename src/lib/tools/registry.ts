import { supabase } from '@/lib/db';
import { Tool, ToolConfig } from '@/lib/db/types';
import { LLMToolDefinition } from '@/lib/llm/types';
import { isHttpConfig } from './executor';

export async function getActiveTools(): Promise<Tool[]> {
  const { data } = await supabase
    .from('tools')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true });
  return (data as Tool[]) || [];
}

export async function getAllTools(): Promise<Tool[]> {
  const { data } = await supabase
    .from('tools')
    .select('*')
    .order('created_at', { ascending: true });
  return (data as Tool[]) || [];
}

export async function getToolById(id: string): Promise<Tool | null> {
  const { data } = await supabase
    .from('tools')
    .select('*')
    .eq('id', id)
    .single();
  return (data as Tool) || null;
}

export async function createTool(
  name: string,
  description: string,
  type: 'http' | 'webhook',
  config: ToolConfig
): Promise<Tool> {
  const id = `tool_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const { data, error } = await supabase
    .from('tools')
    .insert({ id, name, description, type, config })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Tool;
}

export async function updateTool(
  id: string,
  updates: {
    name?: string;
    description?: string;
    type?: 'http' | 'webhook';
    config?: ToolConfig;
    is_active?: boolean;
  }
): Promise<Tool | null> {
  const { data, error } = await supabase
    .from('tools')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Tool;
}

export async function deleteTool(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('tools')
    .delete()
    .eq('id', id);
  return !error;
}

export async function toolsToLLMDefinitions(tools: Tool[]): Promise<LLMToolDefinition[]> {
  return tools
    .filter((t) => t.is_active)
    .filter((t) => {
      const config = t.config as unknown as ToolConfig;
      return isHttpConfig(config);
    })
    .map((tool) => {
      const config = tool.config as unknown as ToolConfig;
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
