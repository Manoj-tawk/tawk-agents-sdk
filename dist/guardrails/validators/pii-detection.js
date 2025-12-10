"use strict";
/**
 * PII Detection Guardrail
 *
 * @module guardrails/validators/pii-detection
 * @description Regex-based PII detection guardrail
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.piiDetectionGuardrail = piiDetectionGuardrail;
const utils_1 = require("../utils");
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
function piiDetectionGuardrail(config) {
    return {
        name: config.name || 'pii_detection',
        type: config.type,
        validate: async (content) => {
            const detectedPII = [];
            // Check each PII category
            for (const [category, pattern] of Object.entries(utils_1.PII_PATTERNS)) {
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
                }
                else {
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
//# sourceMappingURL=pii-detection.js.map