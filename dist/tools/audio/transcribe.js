"use strict";
/**
 * Audio Transcription Feature
 *
 * Provides audio transcription capabilities using AI SDK v5's native `experimental_transcribe`.
 * Converts speech to text using models like Whisper.
 *
 * @module tools/audio
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.transcribeAudioAI = transcribeAudioAI;
exports.createTranscriptionTool = createTranscriptionTool;
const ai_1 = require("ai");
const zod_1 = require("zod");
/**
 * Transcribe audio to text using AI
 *
 * @example
 * ```typescript
 * import { transcribeAudioAI } from '@tawk-agents-sdk/core';
 * import { openai } from '@ai-sdk/openai';
 * import { readFile } from 'fs/promises';
 *
 * const audioData = await readFile('audio.mp3');
 *
 * const result = await transcribeAudioAI({
 *   model: openai.transcription('whisper-1'),
 *   audio: audioData,
 *   language: 'en'
 * });
 *
 * console.log(result.text);
 * ```
 */
async function transcribeAudioAI(options) {
    const { model, audio, language, providerOptions } = options;
    const result = await (0, ai_1.experimental_transcribe)({
        model: model, // AI SDK experimental_transcribe model type
        audio: audio, // AI SDK accepts various audio formats
        providerOptions: {
            ...providerOptions,
            language, // Include language in provider options
        },
    });
    return {
        text: result.text,
        language: result.language,
        duration: result.duration, // Optional field
        metadata: result,
    };
}
/**
 * Create an audio transcription tool for use in agents
 *
 * @param model - The transcription model to use
 *
 * @example
 * ```typescript
 * import { Agent, createTranscriptionTool } from '@tawk-agents-sdk/core';
 * import { openai } from '@ai-sdk/openai';
 *
 * const agent = new Agent({
 *   name: 'transcriber',
 *   instructions: 'You can transcribe audio files to text',
 *   tools: {
 *     transcribe: createTranscriptionTool(openai.transcription('whisper-1'))
 *   }
 * });
 * ```
 */
function createTranscriptionTool(model) {
    return {
        description: 'Transcribe audio to text. Converts speech from audio files into written text.',
        inputSchema: zod_1.z.object({
            audioUrl: zod_1.z.string().url().describe('URL to the audio file to transcribe'),
            language: zod_1.z.string().optional().describe('Language code (e.g., "en", "es") to improve accuracy'),
        }),
        execute: async ({ audioUrl, language }) => {
            // Fetch audio from URL
            const response = await fetch(audioUrl);
            const audioBuffer = await response.arrayBuffer();
            const audioData = new Uint8Array(audioBuffer);
            const result = await transcribeAudioAI({
                model,
                audio: audioData,
                language,
            });
            return {
                success: true,
                text: result.text,
                language: result.language,
                duration: result.duration,
            };
        },
    };
}
//# sourceMappingURL=transcribe.js.map