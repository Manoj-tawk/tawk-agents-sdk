/**
 * Guardrails Shared Utilities
 * 
 * @module guardrails/utils
 * @description Helper functions for guardrail validation
 */

import { getCurrentSpan } from '../tracing/context';
import { extractModelName } from '../lifecycle/langfuse';

/**
 * Create a traced generation for LLM-based guardrails
 * Wraps the guardrail execution in proper Langfuse tracing
 */
export function createGuardrailGeneration(config: {
  name: string;
  model: any;
  systemPrompt: string;
  content: string;
  type: 'input' | 'output';
  metadata?: Record<string, any>;
}) {
  const parentSpan = getCurrentSpan();
  
  return parentSpan?.generation({
    name: `Guardrail: ${config.name}`,
    model: extractModelName(config.model),
    input: {
      system: config.systemPrompt,
      prompt: config.content.substring(0, 500) // Truncate for display
    },
    metadata: {
      guardrailName: config.name,
      guardrailType: config.type,
      ...config.metadata
    }
  });
}

/**
 * End a guardrail generation with usage tracking
 */
export function endGuardrailGeneration(
  generation: any,
  result: any,
  passed: boolean
) {
  if (!generation) return;
  
  generation.end({
    output: {
      classification: result,
      passed
    },
    usage: {
      input: result.usage?.inputTokens || 0,
      output: result.usage?.outputTokens || 0,
      total: (result.usage?.inputTokens || 0) + (result.usage?.outputTokens || 0)
    }
  });
}

/**
 * PII detection patterns
 */
export const PII_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b(\+\d{1,3}[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
  ipAddress: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g
};

/**
 * Calculate content length based on unit
 */
export function calculateLength(
  content: string,
  unit: 'characters' | 'words' | 'tokens' = 'characters'
): number {
  switch (unit) {
    case 'characters':
      return content.length;
    case 'words':
      return content.split(/\s+/).length;
    case 'tokens':
      // Rough estimation: 1 token ≈ 4 characters
      return Math.ceil(content.length / 4);
  }
}

