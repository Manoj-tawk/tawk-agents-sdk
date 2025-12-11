/**
 * Length Guardrail
 * 
 * @module guardrails/validators/length
 * @description Simple length validation guardrail
 */

import type { Guardrail } from '../types';
import { calculateLength } from '../utils';

export interface LengthConfig {
  name?: string;
  type: 'input' | 'output';
  minLength?: number;
  maxLength?: number;
  unit?: 'characters' | 'words' | 'tokens';
}

/**
 * Create a guardrail that validates content length.
 * Supports validation by characters, words, or tokens.
 * 
 * @example
 * ```typescript
 * const guardrail = lengthGuardrail({
 *   type: 'output',
 *   maxLength: 1000,
 *   unit: 'words'
 * });
 * ```
 */
export function lengthGuardrail<TContext = any>(
  config: LengthConfig
): Guardrail<TContext> {
  return {
    name: config.name || 'length_check',
    type: config.type,
    validate: async (content: string) => {
      const length = calculateLength(content, config.unit || 'characters');

      if (config.minLength && length < config.minLength) {
        return {
          passed: false,
          message: `Content too short: ${length} ${config.unit} (min: ${config.minLength})`
        };
      }

      if (config.maxLength && length > config.maxLength) {
        return {
          passed: false,
          message: `Content too long: ${length} ${config.unit} (max: ${config.maxLength})`
        };
      }

      return { passed: true };
    }
  };
}





