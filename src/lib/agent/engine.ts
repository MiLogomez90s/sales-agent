import { supabase } from '@/lib/db';
import { AgentConfig, Conversation, Message } from '@/lib/db/types';
import { chat, buildMessages } from '@/lib/llm/openrouter';
import { ChatMessage, LLMRequestOptions, ToolCall } from '@/lib/llm/types';
import { getActiveTools, toolsToLLMDefinitions } from '@/lib/tools/registry';
import { executeHttpTool, isHttpConfig } from '@/lib/tools/executor';
import { logger } from '@/lib/logger';
import { getRelevantMemories, formatMemoriesForPrompt } from '@/lib/memory';
import { getActiveGuardrails, formatGuardrailsForPrompt, checkGuardrails } from '@/lib/guardrails';

export interface AgentResponse {
  message: string;
  toolCalls: ToolCall[];
  conversationId: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface AgentEvent {
  type: 'thinking' | 'tool_call' | 'tool_result' | 'message' | 'error' | 'done';
  data: unknown;
}

async function getActiveProviderApiKey(): Promise<{ apiKey: string; baseUrl: string } | null> {
  const { data } = await supabase
    .from('llm_providers')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!data) return null;
  return { apiKey: (data as { api_key: string }).api_key, baseUrl: (data as { base_url: string }).base_url };
}

async function getConfig(): Promise<AgentConfig> {
  const { data } = await supabase
    .from('agent_config')
    .select('*')
    .eq('id', 1)
    .single();
  return data as AgentConfig;
}

async function getOrCreateConversation(conversationId?: string): Promise<Conversation> {
  if (conversationId) {
    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();
    if (existing) return existing as Conversation;
  }

  const id = conversationId || `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const { data, error } = await supabase
    .from('conversations')
    .insert({ id, title: 'Nueva conversación' })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Conversation;
}

async function getConversationHistory(conversationId: string): Promise<Message[]> {
  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(50);
  return (data as Message[]) || [];
}

async function saveMessage(
  conversationId: string,
  role: Message['role'],
  content: string,
  toolCalls?: ToolCall[],
  toolCallId?: string
): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      role,
      content,
      tool_calls: toolCalls ? JSON.stringify(toolCalls) : null,
      tool_call_id: toolCallId || null,
    });

  if (error) throw new Error(error.message);
}

function messagesToChatMessages(messages: Message[]): ChatMessage[] {
  return messages
    .filter((m) => m.role !== 'system')
    .map((m) => {
      const msg: ChatMessage = { role: m.role as ChatMessage['role'], content: m.content };
      if (m.tool_calls) {
        try {
          msg.tool_calls = JSON.parse(m.tool_calls);
        } catch { /* ignore */ }
      }
      if (m.tool_call_id) msg.tool_call_id = m.tool_call_id;
      return msg;
    });
}

export async function* runAgent(
  userMessage: string,
  conversationId?: string
): AsyncGenerator<AgentEvent> {
  const config = await getConfig();
  const provider = await getActiveProviderApiKey();

  if (!provider) {
    yield { type: 'error', data: 'No LLM provider configured. Go to Settings → LLM Providers.' };
    return;
  }

  const conversation = await getOrCreateConversation(conversationId);
  const history = await getConversationHistory(conversation.id);
  const tools = await getActiveTools();
  const llmTools = await toolsToLLMDefinitions(tools);

  // Save user message
  await saveMessage(conversation.id, 'user', userMessage);
  logger.info('agent', `New message in ${conversation.id}`, { message: userMessage.slice(0, 100) });

  yield { type: 'thinking', data: 'Processing...' };

  const chatHistory = messagesToChatMessages(history);

  // Inject relevant memories and guardrails into system prompt
  const relevantMemories = await getRelevantMemories(userMessage, 10);
  const memoryContext = formatMemoriesForPrompt(relevantMemories);
  const guardrails = await getActiveGuardrails();
  const guardrailContext = formatGuardrailsForPrompt(guardrails);
  const enhancedSystemPrompt = config.system_prompt + memoryContext + guardrailContext;

  const messages = buildMessages(enhancedSystemPrompt, chatHistory, userMessage);

  const options: LLMRequestOptions = {
    model: config.model,
    messages,
    temperature: config.temperature,
    max_tokens: config.max_tokens,
    tools: llmTools.length > 0 ? llmTools : undefined,
  };

  let finalMessage = '';
  let allToolCalls: ToolCall[] = [];
  let usage: AgentResponse['usage'];

  try {
    const response = await chat(provider.apiKey, options, provider.baseUrl);
    const assistantMsg = response.choices[0]?.message;

    if (response.usage) {
      usage = {
        prompt_tokens: response.usage.prompt_tokens,
        completion_tokens: response.usage.completion_tokens,
        total_tokens: response.usage.total_tokens,
      };
    }

    if (!assistantMsg) {
      yield { type: 'error', data: 'Empty response from LLM' };
      return;
    }

    // Handle tool calls
    if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
      allToolCalls = assistantMsg.tool_calls;
      await saveMessage(conversation.id, 'assistant', assistantMsg.content || '', allToolCalls);

      for (const toolCall of allToolCalls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments || '{}');

        yield { type: 'tool_call', data: { name: toolName, arguments: toolArgs } };

        const tool = tools.find((t) => t.name === toolName);
        if (!tool) {
          const errorMsg = `Tool "${toolName}" not found`;
          logger.error('agent', errorMsg);
          yield { type: 'tool_result', data: { name: toolName, success: false, error: errorMsg } };
          await saveMessage(conversation.id, 'tool', errorMsg, undefined, toolCall.id);
          continue;
        }

        const toolConfig = tool.config as unknown as import('@/lib/db/types').ToolConfig;
        if (!isHttpConfig(toolConfig)) {
          const errorMsg = `Tool "${toolName}" is not an HTTP tool`;
          yield { type: 'tool_result', data: { name: toolName, success: false, error: errorMsg } };
          await saveMessage(conversation.id, 'tool', errorMsg, undefined, toolCall.id);
          continue;
        }

        const result = await executeHttpTool(toolConfig, toolArgs);
        yield { type: 'tool_result', data: { name: toolName, ...result } };

        const resultContent = JSON.stringify(result.data);
        await saveMessage(conversation.id, 'tool', resultContent, undefined, toolCall.id);
      }

      // Second LLM call with tool results
      const updatedHistory = await getConversationHistory(conversation.id);
      const updatedChatHistory = messagesToChatMessages(updatedHistory);
      const followUpMessages = buildMessages(enhancedSystemPrompt, updatedChatHistory, userMessage);

      yield { type: 'thinking', data: 'Processing tool results...' };

      const followUpResponse = await chat(provider.apiKey, {
        ...options,
        messages: followUpMessages,
      }, provider.baseUrl);

      const followUpMsg = followUpResponse.choices[0]?.message;
      if (followUpMsg?.content) {
        finalMessage = followUpMsg.content;
      }

      if (followUpResponse.usage) {
        usage = {
          prompt_tokens: (usage?.prompt_tokens || 0) + followUpResponse.usage.prompt_tokens,
          completion_tokens: (usage?.completion_tokens || 0) + followUpResponse.usage.completion_tokens,
          total_tokens: (usage?.total_tokens || 0) + followUpResponse.usage.total_tokens,
        };
      }
    } else {
      finalMessage = assistantMsg.content || '';
    }

    if (!finalMessage && assistantMsg.content) {
      finalMessage = assistantMsg.content;
    }

    // Check guardrails on final response
    const guardrailCheck = await checkGuardrails(finalMessage, { toolCalls: allToolCalls });
    if (!guardrailCheck.passed) {
      logger.warn('agent', `Guardrail violations: ${guardrailCheck.violations.join('; ')}`, {
        conversationId: conversation.id,
      });
      yield {
        type: 'error',
        data: `Guardrail violations: ${guardrailCheck.violations.join('; ')}`,
      };
    }

    await saveMessage(conversation.id, 'assistant', finalMessage);
    logger.info('agent', `Response generated`, { conversationId: conversation.id, length: finalMessage.length });

    yield { type: 'message', data: finalMessage };
    yield { type: 'done', data: { conversationId: conversation.id, usage } };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('agent', `Agent error: ${message}`, { conversationId: conversation.id });
    yield { type: 'error', data: message };
  }
}

export async function getConversations(): Promise<Conversation[]> {
  const { data } = await supabase
    .from('conversations')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(50);
  return (data as Conversation[]) || [];
}

export async function getConversationMessages(conversationId: string): Promise<Message[]> {
  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  return (data as Message[]) || [];
}

export async function deleteConversation(conversationId: string): Promise<boolean> {
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId);
  return !error;
}
