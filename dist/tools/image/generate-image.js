"use strict";
/**
 * Image Generation Feature
 *
 * Provides image generation capabilities using AI SDK v5's native `experimental_generateImage`.
 * Supports multiple providers (OpenAI DALL-E, Stability AI, etc.)
 *
 * @module tools/image
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateImageAI = generateImageAI;
exports.createImageGenerationTool = createImageGenerationTool;
const ai_1 = require("ai");
const zod_1 = require("zod");
/**
 * Generate an image using AI
 *
 * @example
 * ```typescript
 * import { generateImageAI } from '@tawk-agents-sdk/core';
 * import { openai } from '@ai-sdk/openai';
 *
 * const result = await generateImageAI({
 *   model: openai.image('dall-e-3'),
 *   prompt: 'A serene landscape with mountains',
 *   size: '1024x1024'
 * });
 *
 * console.log(result.images[0]); // base64 image data
 * ```
 */
async function generateImageAI(options) {
    const { model, prompt, n = 1, size, providerOptions } = options;
    const result = await (0, ai_1.experimental_generateImage)({
        model: model, // AI SDK experimental_generateImage model type
        prompt,
        n,
        size: size, // AI SDK accepts string size
        providerOptions,
    });
    // Handle both singular (n=1) and plural (n>1) responses
    const imageArray = result.images || (result.image ? [result.image] : []);
    return {
        images: imageArray.map((img) => {
            if (img.base64)
                return img.base64;
            if (img.uint8Array) {
                // Convert Uint8Array to base64
                if (typeof Buffer !== 'undefined') {
                    return Buffer.from(img.uint8Array).toString('base64');
                }
                return '';
            }
            return '';
        }),
        metadata: result,
    };
}
/**
 * Create an image generation tool for use in agents
 *
 * @param model - The image model to use
 * @param options - Tool configuration options
 *
 * @example
 * ```typescript
 * import { Agent, createImageGenerationTool } from '@tawk-agents-sdk/core';
 * import { openai } from '@ai-sdk/openai';
 *
 * const agent = new Agent({
 *   name: 'artist',
 *   instructions: 'You can generate images based on user descriptions',
 *   tools: {
 *     generateImage: createImageGenerationTool(openai.image('dall-e-3'))
 *   }
 * });
 * ```
 */
function createImageGenerationTool(model, options = {}) {
    const { defaultSize = '1024x1024', maxImages = 4 } = options;
    return {
        description: 'Generate an image based on a text description. Use DALL-E to create visual content.',
        inputSchema: zod_1.z.object({
            prompt: zod_1.z.string().describe('Detailed description of the image to generate'),
            size: zod_1.z.string().optional().describe(`Image size (default: ${defaultSize})`),
            n: zod_1.z.number().min(1).max(maxImages).optional().describe(`Number of images (1-${maxImages}, default: 1)`),
        }),
        execute: async ({ prompt, size, n }) => {
            const result = await generateImageAI({
                model,
                prompt,
                size: size || defaultSize,
                n: n || 1,
            });
            return {
                success: true,
                images: result.images,
                count: result.images.length,
                message: `Generated ${result.images.length} image(s) successfully`,
            };
        },
    };
}
//# sourceMappingURL=generate-image.js.map