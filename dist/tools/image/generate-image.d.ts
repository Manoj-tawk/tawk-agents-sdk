/**
 * Image Generation Feature
 *
 * Provides image generation capabilities using AI SDK v5's native `experimental_generateImage`.
 * Supports multiple providers (OpenAI DALL-E, Stability AI, etc.)
 *
 * @module tools/image
 */
import type { LanguageModel } from 'ai';
import { z } from 'zod';
type CoreTool = {
    description?: string;
    inputSchema: z.ZodSchema<any>;
    execute: (args: any, context?: any) => Promise<any> | any;
};
/**
 * Image generation options
 */
export interface GenerateImageOptions {
    /**
     * The model to use for image generation
     * Examples: 'dall-e-3', 'dall-e-2', 'stable-diffusion-xl'
     */
    model: LanguageModel;
    /**
     * Text prompt describing the image to generate
     */
    prompt: string;
    /**
     * Number of images to generate (default: 1)
     */
    n?: number;
    /**
     * Size of the generated image
     * Examples: '1024x1024', '1792x1024', '1024x1792'
     */
    size?: string;
    /**
     * Additional provider-specific options
     */
    providerOptions?: Record<string, any>;
}
/**
 * Image generation result
 */
export interface GenerateImageResult {
    /**
     * Generated image(s) as base64 strings
     */
    images: string[];
    /**
     * Revised prompt (if provider supports it)
     */
    revisedPrompt?: string;
    /**
     * Additional metadata from the provider
     */
    metadata?: Record<string, any>;
}
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
export declare function generateImageAI(options: GenerateImageOptions): Promise<GenerateImageResult>;
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
export declare function createImageGenerationTool(model: LanguageModel, options?: {
    /**
     * Default size for generated images
     */
    defaultSize?: string;
    /**
     * Maximum number of images to generate at once
     */
    maxImages?: number;
}): CoreTool;
export {};
//# sourceMappingURL=generate-image.d.ts.map