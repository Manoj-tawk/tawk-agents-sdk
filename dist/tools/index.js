"use strict";
/**
 * AI Tools Module
 *
 * Advanced AI capabilities built on top of AI SDK v5:
 * - Image generation (DALL-E, Stable Diffusion, etc.)
 * - Audio transcription (Whisper, etc.)
 * - Text-to-speech (TTS)
 * - Embeddings (for semantic search and RAG)
 * - Reranking (for improving search relevance)
 *
 * All tools are available both as:
 * 1. Standalone functions (for direct use)
 * 2. Tool creators (for use in agents)
 *
 * @module tools
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPineconeSearchToolWithCache = exports.createPineconeSearchTool = exports.createRerankTool = exports.rerankDocuments = exports.createEmbeddingTool = exports.cosineSimilarity = exports.generateEmbeddingsAI = exports.generateEmbeddingAI = exports.createTextToSpeechTool = exports.generateSpeechAI = exports.createTranscriptionTool = exports.transcribeAudioAI = exports.createImageGenerationTool = exports.generateImageAI = void 0;
// ============================================
// IMAGE GENERATION
// ============================================
var image_1 = require("./image");
Object.defineProperty(exports, "generateImageAI", { enumerable: true, get: function () { return image_1.generateImageAI; } });
Object.defineProperty(exports, "createImageGenerationTool", { enumerable: true, get: function () { return image_1.createImageGenerationTool; } });
// ============================================
// AUDIO FEATURES
// ============================================
var audio_1 = require("./audio");
// Transcription
Object.defineProperty(exports, "transcribeAudioAI", { enumerable: true, get: function () { return audio_1.transcribeAudioAI; } });
Object.defineProperty(exports, "createTranscriptionTool", { enumerable: true, get: function () { return audio_1.createTranscriptionTool; } });
// Text-to-Speech
Object.defineProperty(exports, "generateSpeechAI", { enumerable: true, get: function () { return audio_1.generateSpeechAI; } });
Object.defineProperty(exports, "createTextToSpeechTool", { enumerable: true, get: function () { return audio_1.createTextToSpeechTool; } });
// ============================================
// EMBEDDINGS
// ============================================
var embeddings_1 = require("./embeddings");
Object.defineProperty(exports, "generateEmbeddingAI", { enumerable: true, get: function () { return embeddings_1.generateEmbeddingAI; } });
Object.defineProperty(exports, "generateEmbeddingsAI", { enumerable: true, get: function () { return embeddings_1.generateEmbeddingsAI; } });
Object.defineProperty(exports, "cosineSimilarity", { enumerable: true, get: function () { return embeddings_1.cosineSimilarity; } });
Object.defineProperty(exports, "createEmbeddingTool", { enumerable: true, get: function () { return embeddings_1.createEmbeddingTool; } });
// ============================================
// RERANKING
// ============================================
var rerank_1 = require("./rerank");
Object.defineProperty(exports, "rerankDocuments", { enumerable: true, get: function () { return rerank_1.rerankDocuments; } });
Object.defineProperty(exports, "createRerankTool", { enumerable: true, get: function () { return rerank_1.createRerankTool; } });
// ============================================
// RAG (RETRIEVAL-AUGMENTED GENERATION)
// ============================================
var rag_1 = require("./rag");
Object.defineProperty(exports, "createPineconeSearchTool", { enumerable: true, get: function () { return rag_1.createPineconeSearchTool; } });
Object.defineProperty(exports, "createPineconeSearchToolWithCache", { enumerable: true, get: function () { return rag_1.createPineconeSearchToolWithCache; } });
//# sourceMappingURL=index.js.map