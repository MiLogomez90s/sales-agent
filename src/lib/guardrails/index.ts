import { supabase } from '@/lib/db';
import { logger } from '@/lib/logger';

export interface Guardrail {
  id: string;
  name: string;
  type: 'max_discount' | 'forbidden_topic' | 'escalation_keyword' | 'max_response_length' | 'require_approval' | 'custom';
  config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GuardrailInput {
  name: string;
  type: Guardrail['type'];
  config: Record<string, unknown>;
}

export interface GuardrailCheckResult {
  passed: boolean;
  violations: string[];
}

export async function createGuardrail(input: GuardrailInput): Promise<Guardrail> {
  const id = `guard_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const { data, error } = await supabase
    .from('guardrails')
    .insert({ id, name: input.name, type: input.type, config: input.config })
    .select()
    .single();

  if (error) throw new Error(error.message);
  logger.debug('guardrails', `Guardrail created: ${input.name}`, { type: input.type });
  return data as Guardrail;
}

export async function getGuardrailById(id: string): Promise<Guardrail | null> {
  const { data } = await supabase
    .from('guardrails')
    .select('*')
    .eq('id', id)
    .single();
  return (data as Guardrail) || null;
}

export async function getActiveGuardrails(): Promise<Guardrail[]> {
  const { data } = await supabase
    .from('guardrails')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true });
  return (data as Guardrail[]) || [];
}

export async function getAllGuardrails(): Promise<Guardrail[]> {
  const { data } = await supabase
    .from('guardrails')
    .select('*')
    .order('created_at', { ascending: true });
  return (data as Guardrail[]) || [];
}

export async function updateGuardrail(
  id: string,
  updates: {
    name?: string;
    type?: Guardrail['type'];
    config?: Record<string, unknown>;
    is_active?: boolean;
  }
): Promise<Guardrail | null> {
  const { data, error } = await supabase
    .from('guardrails')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Guardrail;
}

export async function deleteGuardrail(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('guardrails')
    .delete()
    .eq('id', id);
  return !error;
}

export async function checkGuardrails(
  response: string,
  context?: { toolCalls?: Array<{ function: { name: string; arguments: string } }> }
): Promise<GuardrailCheckResult> {
  const guardrails = await getActiveGuardrails();
  const violations: string[] = [];

  for (const guardrail of guardrails) {
    const config = guardrail.config as Record<string, unknown>;

    switch (guardrail.type) {
      case 'max_discount': {
        const maxDiscount = config.max_discount as number;
        const discountMatch = response.match(/(\d+)%/);
        if (discountMatch) {
          const discount = parseInt(discountMatch[1], 10);
          if (discount > maxDiscount) {
            violations.push(
              `Descuento de ${discount}% excede el máximo permitido de ${maxDiscount}%`
            );
          }
        }
        break;
      }

      case 'forbidden_topic': {
        const topics = (config.topics as string[]) || [];
        const lowerResponse = response.toLowerCase();
        for (const topic of topics) {
          if (lowerResponse.includes(topic.toLowerCase())) {
            violations.push(`Respuesta contiene tema prohibido: "${topic}"`);
          }
        }
        break;
      }

      case 'escalation_keyword': {
        const keywords = (config.keywords as string[]) || [];
        const lowerResponse = response.toLowerCase();
        for (const keyword of keywords) {
          if (lowerResponse.includes(keyword.toLowerCase())) {
            violations.push(
              `Se detectó palabra de escalación: "${keyword}" — requiere aprobación humana`
            );
          }
        }
        break;
      }

      case 'max_response_length': {
        const maxLength = config.max_length as number;
        if (response.length > maxLength) {
          violations.push(
            `Respuesta (${response.length} chars) excede el máximo de ${maxLength} caracteres`
          );
        }
        break;
      }

      case 'require_approval': {
        const tools = (config.tools as string[]) || [];
        if (context?.toolCalls) {
          for (const call of context.toolCalls) {
            if (tools.includes(call.function.name)) {
              violations.push(
                `La herramienta "${call.function.name}" requiere aprobación humana antes de ejecutarse`
              );
            }
          }
        }
        break;
      }

      case 'custom': {
        const patterns = (config.patterns as string[]) || [];
        for (const pattern of patterns) {
          try {
            const regex = new RegExp(pattern, 'i');
            if (regex.test(response)) {
              violations.push(`Respuesta coincide con patrón personalizado: ${pattern}`);
            }
          } catch {
            logger.warn('guardrails', `Invalid regex pattern: ${pattern}`);
          }
        }
        break;
      }
    }
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}

export function formatGuardrailsForPrompt(guardrails: Guardrail[]): string {
  if (guardrails.length === 0) return '';

  const lines: string[] = ['\n\n## Guardrails (reglas que DEBES seguir estrictamente):'];

  for (const g of guardrails) {
    const config = g.config as Record<string, unknown>;

    switch (g.type) {
      case 'max_discount':
        lines.push(`- Nunca ofrezcas un descuento mayor a ${config.max_discount}%`);
        break;
      case 'forbidden_topic':
        lines.push(`- Nunca hables de: ${(config.topics as string[]).join(', ')}`);
        break;
      case 'escalation_keyword':
        lines.push(
          `- Si el cliente menciona "${(config.keywords as string[]).join(', ')}", escala inmediatamente a un humano`
        );
        break;
      case 'max_response_length':
        lines.push(`- Tus respuestas no deben exceder ${config.max_length} caracteres`);
        break;
      case 'require_approval':
        lines.push(
          `- Antes de usar las herramientas [${(config.tools as string[]).join(', ')}], pide confirmación al usuario`
        );
        break;
      case 'custom':
        lines.push(`- Regla personalizada: ${g.name}`);
        break;
    }
  }

  return lines.join('\n');
}
