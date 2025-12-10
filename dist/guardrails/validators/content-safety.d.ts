/**
 * Content Safety Guardrail
 *
 * @module guardrails/validators/content-safety
 * @description LLM-powered content moderation guardrail
 */
import type { Guardrail } from '../types';
export interface ContentSafetyConfig {
    name?: string;
    type: 'input' | 'output';
    model: any;
    categories?: string[];
    threshold?: number;
}
/**
 * Create a guardrail that blocks harmful or inappropriate content.
 * Uses an AI model to classify content safety.
 *
 * @example
 * ```typescript
 * const guardrail = contentSafetyGuardrail({
 *   type: 'input',
 *   model: openai('gpt-4o-mini'),
 *   categories: ['violence', 'hate-speech']
 * });
 * ```
 */
export declare function contentSafetyGuardrail<TContext = any>(config: ContentSafetyConfig): Guardrail<TContext>;
//# sourceMappingURL=content-safety.d.ts.map