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
export { generateImageAI, createImageGenerationTool, type GenerateImageOptions, type GenerateImageResult, } from './image';
export { transcribeAudioAI, createTranscriptionTool, type TranscribeAudioOptions, type TranscribeAudioResult, generateSpeechAI, createTextToSpeechTool, type GenerateSpeechOptions, type GenerateSpeechResult, } from './audio';
export { generateEmbeddingAI, generateEmbeddingsAI, cosineSimilarity, createEmbeddingTool, type GenerateEmbeddingOptions, type GenerateEmbeddingsOptions, type EmbeddingResult, type EmbeddingsResult, } from './embeddings';
export { rerankDocuments, createRerankTool, type RerankOptions, type RerankResult, } from './rerank';
export { createPineconeSearchTool, createPineconeSearchToolWithCache, type PineconeSearchConfig, type SearchDocument, type PineconeSearchResult, } from './rag';
//# sourceMappingURL=index.d.ts.map