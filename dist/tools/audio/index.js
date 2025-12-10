"use strict";
/**
 * Audio Features (Transcription & Text-to-Speech)
 *
 * @module tools/audio
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTextToSpeechTool = exports.generateSpeechAI = exports.createTranscriptionTool = exports.transcribeAudioAI = void 0;
var transcribe_1 = require("./transcribe");
Object.defineProperty(exports, "transcribeAudioAI", { enumerable: true, get: function () { return transcribe_1.transcribeAudioAI; } });
Object.defineProperty(exports, "createTranscriptionTool", { enumerable: true, get: function () { return transcribe_1.createTranscriptionTool; } });
var generate_speech_1 = require("./generate-speech");
Object.defineProperty(exports, "generateSpeechAI", { enumerable: true, get: function () { return generate_speech_1.generateSpeechAI; } });
Object.defineProperty(exports, "createTextToSpeechTool", { enumerable: true, get: function () { return generate_speech_1.createTextToSpeechTool; } });
//# sourceMappingURL=index.js.map