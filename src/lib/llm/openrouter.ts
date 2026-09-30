import { ChatMessage, LLMRequestOptions, LLMResponse, LLMStreamChunk } from './types';
import { logger } from '@/lib/logger';

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';

export async function chat(
  apiKey: string,
  options: LLMRequestOptions,
  baseUrl: string = DEFAULT_BASE_URL
): Promise<LLMResponse> {
  const url = `${baseUrl}/chat/completions`;

  const body: Record<string, unknown> = {
    model: options.model,
    messages: options.messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.max_tokens ?? 4096,
  };

  if (options.tools && options.tools.length > 0) {
    body.tools = options.tools;
    body.tool_choice = options.tool_choice || 'auto';
  }

  logger.debug('llm', `Calling LLM: ${options.model}`, { url, messageCount: options.messages.length });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'Sales Agent',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('llm', `LLM API error: ${response.status}`, { error: errorText });
    throw new Error(`LLM API error ${response.status}: ${errorText}`);
  }

  const data = await response.json() as LLMResponse;
  logger.debug('llm', `LLM response received`, {
    model: options.model,
    usage: data.usage,
    finishReason: data.choices[0]?.finish_reason,
  });

  return data;
}

export async function* chatStream(
  apiKey: string,
  options: LLMRequestOptions,
  baseUrl: string = DEFAULT_BASE_URL
): AsyncGenerator<LLMStreamChunk> {
  const url = `${baseUrl}/chat/completions`;

  const body: Record<string, unknown> = {
    model: options.model,
    messages: options.messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.max_tokens ?? 4096,
    stream: true,
  };

  if (options.tools && options.tools.length > 0) {
    body.tools = options.tools;
    body.tool_choice = options.tool_choice || 'auto';
  }

  logger.debug('llm', `Starting LLM stream: ${options.model}`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'Sales Agent',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('llm', `LLM stream error: ${response.status}`, { error: errorText });
    throw new Error(`LLM stream error ${response.status}: ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const data = trimmed.slice(6);
      if (data === '[DONE]') return;

      try {
        const chunk = JSON.parse(data) as LLMStreamChunk;
        yield chunk;
      } catch {
        // Skip malformed chunks
      }
    }
  }
}

export async function listModels(
  apiKey: string,
  baseUrl: string = DEFAULT_BASE_URL
): Promise<Array<{ id: string; name: string }>> {
  const response = await fetch(`${baseUrl}/models`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to list models: ${response.status}`);
  }

  const data = await response.json() as { data: Array<{ id: string; name: string }> };
  return data.data.map((m) => ({ id: m.id, name: m.name || m.id }));
}

export function buildMessages(
  systemPrompt: string,
  history: ChatMessage[],
  userMessage: string
): ChatMessage[] {
  const messages: ChatMessage[] = [];

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }

  for (const msg of history) {
    const cleaned: ChatMessage = { role: msg.role, content: msg.content };
    if (msg.tool_calls) cleaned.tool_calls = msg.tool_calls;
    if (msg.tool_call_id) cleaned.tool_call_id = msg.tool_call_id;
    if (msg.name) cleaned.name = msg.name;
    messages.push(cleaned);
  }

  messages.push({ role: 'user', content: userMessage });

  return messages;
}
