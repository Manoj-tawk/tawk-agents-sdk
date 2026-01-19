"use strict";
/**
 * Length Guardrail
 *
 * @module guardrails/validators/length
 * @description Simple length validation guardrail with accurate token counting
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.lengthGuardrail = lengthGuardrail;
const utils_1 = require("../utils");
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
function lengthGuardrail(config) {
    const unit = config.unit || 'characters';
    return {
        name: config.name || 'length_check',
        type: config.type,
        validate: async (content, contextWrapper) => {
            const characterLength = content.length;
            const tokenCount = await contextWrapper.agent._tokenizerFn(content);
            // Calculate length in configured unit
            let length;
            if (unit === 'tokens') {
                length = tokenCount;
            }
            else {
                length = (0, utils_1.calculateLength)(content, unit);
            }
            const metadata = { characterLength, tokenCount };
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
//# sourceMappingURL=length.js.map