import { HttpToolConfig, ToolConfig } from '@/lib/db/types';
import { logger } from '@/lib/logger';

export interface ToolResult {
  success: boolean;
  data: unknown;
  error?: string;
  status_code?: number;
}

export function isHttpConfig(config: ToolConfig): config is HttpToolConfig {
  return 'method' in config && 'url' in config;
}

export function isWebhookConfig(config: ToolConfig): config is { trigger_description: string } {
  return 'trigger_description' in config;
}

export async function executeHttpTool(
  config: HttpToolConfig,
  parameters: Record<string, unknown>
): Promise<ToolResult> {
  const { method, url, headers = {}, body_template, timeout_ms = 30000 } = config;

  // Replace {{param}} placeholders in URL
  let resolvedUrl = url;
  for (const [key, value] of Object.entries(parameters)) {
    resolvedUrl = resolvedUrl.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
  }

  // Build body from template or use parameters directly
  let body: string | undefined;
  if (body_template) {
    let resolvedBody = body_template;
    for (const [key, value] of Object.entries(parameters)) {
      resolvedBody = resolvedBody.replace(
        new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
        typeof value === 'object' ? JSON.stringify(value) : String(value)
      );
    }
    body = resolvedBody;
  } else if (method !== 'GET') {
    body = JSON.stringify(parameters);
  }

  const finalHeaders: Record<string, string> = { ...headers };
  if (body && !finalHeaders['Content-Type']) {
    finalHeaders['Content-Type'] = 'application/json';
  }

  logger.debug('tool', `Executing HTTP tool: ${method} ${resolvedUrl}`, { parameters });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeout_ms);

    const response = await fetch(resolvedUrl, {
      method,
      headers: finalHeaders,
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const responseText = await response.text();
    let data: unknown;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = responseText;
    }

    logger.debug('tool', `HTTP tool response: ${response.status}`, { url: resolvedUrl });

    return {
      success: response.ok,
      data,
      status_code: response.status,
      error: response.ok ? undefined : `HTTP ${response.status}: ${responseText.slice(0, 500)}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('tool', `HTTP tool failed: ${method} ${resolvedUrl}`, { error: message });
    return { success: false, data: null, error: message };
  }
}

export function validateToolConfig(config: ToolConfig): string[] {
  const errors: string[] = [];

  if (isHttpConfig(config)) {
    if (!config.method) errors.push('method is required');
    if (!config.url) errors.push('url is required');
    if (config.url && !config.url.startsWith('http')) {
      errors.push('url must start with http:// or https://');
    }
  } else if (isWebhookConfig(config)) {
    if (!config.trigger_description) errors.push('trigger_description is required');
  } else {
    errors.push('Invalid tool config: must be http or webhook type');
  }

  return errors;
}
