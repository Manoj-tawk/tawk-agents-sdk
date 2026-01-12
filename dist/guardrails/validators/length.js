"use strict";
/**
 * Length Guardrail
 *
 * @module guardrails/validators/length
 * @description Simple length validation guardrail
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.lengthGuardrail = lengthGuardrail;
const utils_1 = require("../utils");
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
function lengthGuardrail(config) {
    const unit = config.unit || 'characters';
    return {
        name: config.name || 'length_check',
        type: config.type,
        validate: async (content) => {
            const length = (0, utils_1.calculateLength)(content, unit);
            if (config.minLength && length < config.minLength) {
                return {
                    passed: false,
                    message: `Content too short: ${length} ${unit} (min: ${config.minLength})`
                };
            }
            if (config.maxLength && length > config.maxLength) {
                return {
                    passed: false,
                    message: `Content too long: ${length} ${unit} (max: ${config.maxLength})`
                };
            }
            return { passed: true };
        }
    };
}
//# sourceMappingURL=length.js.map