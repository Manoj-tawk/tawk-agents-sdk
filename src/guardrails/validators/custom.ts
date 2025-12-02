/**
 * Custom Guardrail Factory
 * 
 * @module guardrails/validators/custom
 * @description Create custom guardrails with your own validation logic
 */

import type { Guardrail, GuardrailResult, RunContextWrapper } from '../types';

export interface CustomConfig<TContext = any> {
  name: string;
  type: 'input' | 'output';
  validate: (content: string, context: RunContextWrapper<TContext>) => Promise<GuardrailResult> | GuardrailResult;
}

/**
 * Create a custom guardrail with your own validation function.
 * Provides maximum flexibility for custom validation logic.
 * 
 * @example
 * ```typescript
 * const guardrail = customGuardrail({
 *   name: 'business-hours',
 *   type: 'input',
 *   validate: async (content, context) => {
 *     const hour = new Date().getHours();
 *     return {
 *       passed: hour >= 9 && hour <= 17,
 *       message: 'Service only available 9 AM - 5 PM'
 *     };
 *   }
 * });
 * ```
 */
export function customGuardrail<TContext = any>(
  config: CustomConfig<TContext>
): Guardrail<TContext> {
  return {
    name: config.name,
    type: config.type,
    validate: config.validate
  };
}

