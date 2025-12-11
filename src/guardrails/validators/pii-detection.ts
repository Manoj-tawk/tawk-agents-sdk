/**
 * PII Detection Guardrail
 * 
 * @module guardrails/validators/pii-detection
 * @description Regex-based PII detection guardrail
 */

import type { Guardrail } from '../types';
import { PII_PATTERNS } from '../utils';

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
export function piiDetectionGuardrail<TContext = any>(
  config: PIIDetectionConfig
): Guardrail<TContext> {
  return {
    name: config.name || 'pii_detection',
    type: config.type,
    validate: async (content: string) => {
      const detectedPII: string[] = [];

      // Check each PII category
      for (const [category, pattern] of Object.entries(PII_PATTERNS)) {
        if (!config.categories || config.categories.includes(category)) {
          const matches = content.match(pattern);
          if (matches) {
            detectedPII.push(category);
          }
        }
      }

      if (detectedPII.length > 0) {
        if (config.block !== false) {
          return {
            passed: false,
            message: `PII detected: ${detectedPII.join(', ')}`,
            metadata: { detectedCategories: detectedPII }
          };
        } else {
          // Just warn, don't block
          return {
            passed: true,
            message: `Warning: PII detected: ${detectedPII.join(', ')}`,
            metadata: { detectedCategories: detectedPII }
          };
        }
      }

      return { passed: true };
    }
  };
}





