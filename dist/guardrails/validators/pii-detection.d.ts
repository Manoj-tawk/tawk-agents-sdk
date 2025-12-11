/**
 * PII Detection Guardrail
 *
 * @module guardrails/validators/pii-detection
 * @description Regex-based PII detection guardrail
 */
import type { Guardrail } from '../types';
export interface PIIDetectionConfig {
    name?: string;
    type: 'input' | 'output';
    block?: boolean;
    categories?: string[];
}
/**
 * Create a guardrail that detects and optionally blocks PII.
 * Uses regex patterns to detect emails, phone numbers, SSNs, credit cards, and IP addresses.
 *
 * @example
 * ```typescript
 * const guardrail = piiDetectionGuardrail({
 *   type: 'output',
 *   block: true
 * });
 * ```
 */
export declare function piiDetectionGuardrail<TContext = any>(config: PIIDetectionConfig): Guardrail<TContext>;
//# sourceMappingURL=pii-detection.d.ts.map