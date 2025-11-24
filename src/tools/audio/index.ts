/**
 * Audio Features (Transcription & Text-to-Speech)
 * 
 * @module tools/audio
 */

export {
  transcribeAudioAI,
  createTranscriptionTool,
} from './transcribe';

export {
  generateSpeechAI,
  createTextToSpeechTool,
} from './generate-speech';

export type {
  TranscribeAudioOptions,
  TranscribeAudioResult,
} from './transcribe';

export type {
  GenerateSpeechOptions,
  GenerateSpeechResult,
} from './generate-speech';

