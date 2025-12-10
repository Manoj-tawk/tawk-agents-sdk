/**
 * Length Guardrail
 *
 * @module guardrails/validators/length
 * @description Simple length validation guardrail
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
 * @example
 * ```typescript
 * const guardrail = lengthGuardrail({
 *   type: 'output',
 *   maxLength: 1000,
 *   unit: 'words'
 * });
 * ```
 */
export declare function lengthGuardrail<TContext = any>(config: LengthConfig): Guardrail<TContext>;
//# sourceMappingURL=length.d.ts.map