/**
 * Length Guardrail
 * 
 * @module guardrails/validators/length
 * @description Simple length validation guardrail with accurate token counting
 */

import type { Guardrail, RunContextWrapper } from '../types';
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
 * When unit is 'tokens', the guardrail uses the agent's tokenizerFn
 * for accurate token counting.
 * 
 * @example
 * ```typescript
 * const guardrail = lengthGuardrail({
 *   type: 'output',
 *   maxLength: 1000,
 *   unit: 'tokens'
 * });
 * ```
 */
export function lengthGuardrail<TContext = any>(
  config: LengthConfig
): Guardrail<TContext> {
  const unit = config.unit || 'characters';
  
  return {
    name: config.name || 'length_check',
    type: config.type,
    validate: async (content: string, contextWrapper: RunContextWrapper<TContext>) => {
      const characterLength = content.length;
      const tokenCount = await contextWrapper.agent._tokenizerFn(content);
      
      // Calculate length in configured unit
      let length: number;
      if (unit === 'tokens') {
        length = tokenCount;
      } else {
        length = calculateLength(content, unit);
      }

      const metadata = { 
        characterLength, 
        tokenCount,
        unit,
        maxLength: config.maxLength
      };

      if (config.minLength && length < config.minLength) {
        return {
          passed: false,
          message: `Content too short: ${length} ${unit} (min: ${config.minLength})`,
          metadata
        };
      }

      if (config.maxLength && length > config.maxLength) {
        return {
          passed: false,
          message: `Content too long: ${length} ${unit} (max: ${config.maxLength})`,
          metadata
        };
      }

      return { passed: true, metadata };
    }
  };
}





