"use strict";
/**
 * Embeddings Generation Feature
 *
 * Provides text embedding capabilities using AI SDK v5's native `embed` and `embedMany`.
 * Generates vector representations of text for semantic search and RAG.
 *
 * @module tools/embeddings
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEmbeddingAI = generateEmbeddingAI;
exports.generateEmbeddingsAI = generateEmbeddingsAI;
exports.cosineSimilarity = cosineSimilarity;
exports.createEmbeddingTool = createEmbeddingTool;
const ai_1 = require("ai");
const zod_1 = require("zod");
/**
 * Generate an embedding for a single text
 *
 * @example
 * ```typescript
 * import { generateEmbeddingAI } from '@tawk-agents-sdk/core';
 * import { openai } from '@ai-sdk/openai';
 *
 * const result = await generateEmbeddingAI({
 *   model: openai.embedding('text-embedding-3-small'),
 *   value: 'Hello, world!'
 * });
 *
 * console.log(result.embedding); // [0.1, -0.2, 0.3, ...]
 * console.log(result.dimensions); // 1536
 * ```
 */
async function generateEmbeddingAI(options) {
    const { model, value, providerOptions } = options;
    const result = await (0, ai_1.embed)({
        model,
        value,
        providerOptions,
    });
    return {
        embedding: result.embedding,
        dimensions: result.embedding.length,
        usage: result.usage ? { tokens: result.usage.tokens } : undefined,
    };
}
/**
 * Generate embeddings for multiple texts
 *
 * @example
 * ```typescript
 * import { generateEmbeddingsAI } from '@tawk-agents-sdk/core';
 * import { openai } from '@ai-sdk/openai';
 *
 * const result = await generateEmbeddingsAI({
 *   model: openai.embedding('text-embedding-3-small'),
 *   values: ['Hello', 'World', 'AI']
 * });
 *
 * console.log(result.embeddings.length); // 3
 * console.log(result.dimensions); // 1536
 * ```
 */
async function generateEmbeddingsAI(options) {
    const { model, values, providerOptions } = options;
    const result = await (0, ai_1.embedMany)({
        model,
        values,
        providerOptions,
    });
    return {
        embeddings: result.embeddings,
        dimensions: result.embeddings[0]?.length || 0,
        usage: result.usage ? { tokens: result.usage.tokens } : undefined,
    };
}
/**
 * Calculate cosine similarity between two embedding vectors
 *
 * @param embedding1 - First embedding vector
 * @param embedding2 - Second embedding vector
 * @returns Similarity score between -1 and 1 (higher is more similar)
 *
 * @example
 * ```typescript
 * const similarity = cosineSimilarity(embedding1, embedding2);
 * console.log(similarity); // 0.85
 * ```
 */
function cosineSimilarity(embedding1, embedding2) {
    if (embedding1.length !== embedding2.length) {
        throw new Error('Embeddings must have the same dimensions');
    }
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    for (let i = 0; i < embedding1.length; i++) {
        dotProduct += embedding1[i] * embedding2[i];
        norm1 += embedding1[i] ** 2;
        norm2 += embedding2[i] ** 2;
    }
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}
/**
 * Create an embedding generation tool for use in agents
 *
 * @param model - The embedding model to use
 *
 * @example
 * ```typescript
 * import { Agent, createEmbeddingTool } from '@tawk-agents-sdk/core';
 * import { openai } from '@ai-sdk/openai';
 *
 * const agent = new Agent({
 *   name: 'embedder',
 *   instructions: 'You can generate embeddings for semantic search',
 *   tools: {
 *     generateEmbedding: createEmbeddingTool(openai.embedding('text-embedding-3-small'))
 *   }
 * });
 * ```
 */
function createEmbeddingTool(model) {
    return {
        description: 'Generate embedding vectors for text. Used for semantic search and similarity comparison.',
        inputSchema: zod_1.z.object({
            text: zod_1.z.string().describe('Text to generate embedding for'),
        }),
        execute: async ({ text }) => {
            const result = await generateEmbeddingAI({
                model,
                value: text,
            });
            return {
                success: true,
                embedding: result.embedding,
                dimensions: result.dimensions,
                usage: result.usage,
            };
        },
    };
}
//# sourceMappingURL=generate-embeddings.js.map