export interface AgentConfig {
  id: number;
  system_prompt: string;
  model: string;
  temperature: number;
  max_tokens: number;
  language: string;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls: string | null;
  tool_call_id: string | null;
  created_at: string;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  type: 'http' | 'webhook';
  config: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface LogEntry {
  id: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  category: string;
  message: string;
  metadata: string | null;
  created_at: string;
}

export interface LlmProvider {
  id: string;
  name: string;
  api_key: string;
  base_url: string;
  models: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface HttpToolConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers?: Record<string, string>;
  body_template?: string;
  timeout_ms?: number;
}

export interface WebhookToolConfig {
  trigger_description: string;
  payload_schema?: Record<string, unknown>;
  response_template?: string;
}

export type ToolConfig = HttpToolConfig | WebhookToolConfig;
