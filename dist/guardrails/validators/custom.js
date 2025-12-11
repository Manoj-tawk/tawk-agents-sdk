"use strict";
/**
 * Custom Guardrail Factory
 *
 * @module guardrails/validators/custom
 * @description Create custom guardrails with your own validation logic
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.customGuardrail = customGuardrail;
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
function customGuardrail(config) {
    return {
        name: config.name,
        type: config.type,
        validate: config.validate
    };
}
//# sourceMappingURL=custom.js.map