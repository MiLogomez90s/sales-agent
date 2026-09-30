export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface LLMResponse {
  id: string;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface LLMStreamChunk {
  id: string;
  choices: Array<{
    index: number;
    delta: Partial<ChatMessage>;
    finish_reason: string | null;
  }>;
}

export interface LLMRequestOptions {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  tools?: LLMToolDefinition[];
  tool_choice?: 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } };
  stream?: boolean;
}

export interface LLMToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface LLMProviderConfig {
  api_key: string;
  base_url: string;
  model: string;
}
