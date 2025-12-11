/**
 * Text-to-Speech (TTS) Feature
 *
 * Provides speech generation capabilities using AI SDK v5's native `experimental_generateSpeech`.
 * Converts text to natural-sounding speech.
 *
 * @module tools/audio
 */
import type { LanguageModel } from 'ai';
import { z } from 'zod';
type CoreTool = {
    description?: string;
    inputSchema: z.ZodSchema<any>;
    execute: (args: any, context?: any) => Promise<any> | any;
};
/**
 * Speech generation options
 */
export interface GenerateSpeechOptions {
    /**
     * The model to use for speech generation
     * Examples: 'tts-1', 'tts-1-hd'
     */
    model: LanguageModel;
    /**
     * Text to convert to speech
     */
    text: string;
    /**
     * Voice to use for speech
     * Examples: 'alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'
     */
    voice?: string;
    /**
     * Speed of speech (0.25 to 4.0, default: 1.0)
     */
    speed?: number;
    /**
     * Additional provider-specific options
     */
    providerOptions?: Record<string, any>;
}
/**
 * Speech generation result
 */
export interface GenerateSpeechResult {
    /**
     * Generated audio as Uint8Array
     */
    audio: Uint8Array;
    /**
     * Audio format (e.g., 'mp3', 'opus', 'aac', 'flac')
     */
    format?: string;
    /**
     * Duration in seconds (if available)
     */
    duration?: number;
    /**
     * Additional metadata from the provider
     */
    metadata?: Record<string, any>;
}
/**
 * Generate speech from text using AI
 *
 * @example
 * ```typescript
 * import { generateSpeechAI } from '@tawk-agents-sdk/core';
 * import { openai } from '@ai-sdk/openai';
 * import { writeFile } from 'fs/promises';
 *
 * const result = await generateSpeechAI({
 *   model: openai.speech('tts-1'),
 *   text: 'Hello, world!',
 *   voice: 'alloy'
 * });
 *
 * await writeFile('output.mp3', result.audio);
 * ```
 */
export declare function generateSpeechAI(options: GenerateSpeechOptions): Promise<GenerateSpeechResult>;
/**
 * Create a text-to-speech tool for use in agents
 *
 * @param model - The TTS model to use
 * @param options - Tool configuration options
 *
 * @example
 * ```typescript
 * import { Agent, createTextToSpeechTool } from '@tawk-agents-sdk/core';
 * import { openai } from '@ai-sdk/openai';
 *
 * const agent = new Agent({
 *   name: 'speaker',
 *   instructions: 'You can convert text to speech',
 *   tools: {
 *     textToSpeech: createTextToSpeechTool(openai.speech('tts-1'))
 *   }
 * });
 * ```
 */
export declare function createTextToSpeechTool(model: LanguageModel, options?: {
    /**
     * Default voice to use
     */
    defaultVoice?: string;
    /**
     * Available voices
     */
    availableVoices?: string[];
}): CoreTool;
export {};
//# sourceMappingURL=generate-speech.d.ts.map