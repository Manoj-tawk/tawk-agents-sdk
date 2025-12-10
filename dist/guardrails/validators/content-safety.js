"use strict";
/**
 * Content Safety Guardrail
 *
 * @module guardrails/validators/content-safety
 * @description LLM-powered content moderation guardrail
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.contentSafetyGuardrail = contentSafetyGuardrail;
const ai_1 = require("ai");
const zod_1 = require("zod");
const utils_1 = require("../utils");
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
function contentSafetyGuardrail(config) {
    return {
        name: config.name || 'content_safety',
        type: config.type,
        validate: async (content) => {
            const categories = config.categories || [
                'hate speech',
                'violence',
                'sexual content',
                'harassment',
                'self-harm'
            ];
            const generation = (0, utils_1.createGuardrailGeneration)({
                name: config.name || 'content_safety',
                model: config.model,
                systemPrompt: `You are a content moderation system. Analyze the following text and determine if it contains any of these categories: ${categories.join(', ')}. Respond with a JSON object.`,
                content,
                type: config.type,
                metadata: { categories }
            });
            const result = await (0, ai_1.generateText)({
                model: config.model,
                system: `You are a content moderation system. Analyze the following text and determine if it contains any of these categories: ${categories.join(', ')}. Respond with a JSON object.`,
                prompt: content,
                tools: {
                    classify: {
                        description: 'Classify content safety',
                        inputSchema: zod_1.z.object({
                            isSafe: zod_1.z.boolean(),
                            detectedCategories: zod_1.z.array(zod_1.z.string()),
                            confidence: zod_1.z.number()
                        }),
                        execute: async (args) => args
                    }
                }
            });
            const classification = result.toolCalls?.[0]?.input;
            (0, utils_1.endGuardrailGeneration)(generation, result, !classification || classification.isSafe);
            if (!classification || classification.isSafe) {
                return { passed: true };
            }
            return {
                passed: false,
                message: `Content contains: ${classification.detectedCategories?.join(', ') || 'unsafe content'}`,
                metadata: classification
            };
        }
    };
}
//# sourceMappingURL=content-safety.js.map