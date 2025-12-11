/**
 * Audio Transcription Feature
 *
 * Provides audio transcription capabilities using AI SDK v5's native `experimental_transcribe`.
 * Converts speech to text using models like Whisper.
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
 * Audio transcription options
 */
export interface TranscribeAudioOptions {
    /**
     * The model to use for transcription
     * Examples: 'whisper-1'
     */
    model: LanguageModel;
    /**
     * Audio file data (as Uint8Array, File, or URL)
     */
    audio: Uint8Array | File | string;
    /**
     * Language of the audio (ISO-639-1 format, e.g., 'en', 'es')
     * Helps improve accuracy
     */
    language?: string;
    /**
     * Additional provider-specific options
     */
    providerOptions?: Record<string, any>;
}
/**
 * Audio transcription result
 */
export interface TranscribeAudioResult {
    /**
     * The transcribed text
     */
    text: string;
    /**
     * Detected language (if available)
     */
    language?: string;
    /**
     * Duration of the audio in seconds (if available)
     */
    duration?: number;
    /**
     * Additional metadata from the provider
     */
    metadata?: Record<string, any>;
}
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
export declare function transcribeAudioAI(options: TranscribeAudioOptions): Promise<TranscribeAudioResult>;
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
export declare function createTranscriptionTool(model: LanguageModel): CoreTool;
export {};
//# sourceMappingURL=transcribe.d.ts.map