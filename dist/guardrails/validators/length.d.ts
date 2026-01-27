/**
 * Length Guardrail
 *
 * @module guardrails/validators/length
 * @description Simple length validation guardrail with accurate token counting
 */
import type { Guardrail } from '../types';
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
export declare function lengthGuardrail<TContext = any>(config: LengthConfig): Guardrail<TContext>;
//# sourceMappingURL=length.d.ts.map