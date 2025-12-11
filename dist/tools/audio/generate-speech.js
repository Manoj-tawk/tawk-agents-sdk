"use strict";
/**
 * Text-to-Speech (TTS) Feature
 *
 * Provides speech generation capabilities using AI SDK v5's native `experimental_generateSpeech`.
 * Converts text to natural-sounding speech.
 *
 * @module tools/audio
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSpeechAI = generateSpeechAI;
exports.createTextToSpeechTool = createTextToSpeechTool;
const ai_1 = require("ai");
const zod_1 = require("zod");
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
async function generateSpeechAI(options) {
    const { model, text, voice, speed, providerOptions } = options;
    const result = await (0, ai_1.experimental_generateSpeech)({
        model: model, // AI SDK experimental_generateSpeech model type
        text,
        voice,
        speed,
        providerOptions,
    });
    // Extract audio data from result
    const audioData = result.audio || new Uint8Array();
    return {
        audio: audioData,
        format: result.format,
        duration: result.duration,
        metadata: result,
    };
}
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
function createTextToSpeechTool(model, options = {}) {
    const { defaultVoice = 'alloy', availableVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] } = options;
    return {
        description: 'Convert text to speech. Generate natural-sounding audio from written text.',
        inputSchema: zod_1.z.object({
            text: zod_1.z.string().max(4096).describe('Text to convert to speech (max 4096 characters)'),
            voice: zod_1.z.enum(availableVoices).optional()
                .describe(`Voice to use (${availableVoices.join(', ')}). Default: ${defaultVoice}`),
            speed: zod_1.z.number().min(0.25).max(4.0).optional()
                .describe('Speed of speech (0.25 to 4.0, default: 1.0)'),
        }),
        execute: async ({ text, voice, speed }) => {
            const result = await generateSpeechAI({
                model,
                text,
                voice: voice || defaultVoice,
                speed,
            });
            // Convert Uint8Array to base64 for transport
            const base64Audio = Buffer.from(result.audio).toString('base64');
            return {
                success: true,
                audio: base64Audio,
                format: result.format || 'mp3',
                duration: result.duration,
                message: 'Speech generated successfully',
            };
        },
    };
}
//# sourceMappingURL=generate-speech.js.map