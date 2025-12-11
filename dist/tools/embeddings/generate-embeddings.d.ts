/**
 * Embeddings Generation Feature
 *
 * Provides text embedding capabilities using AI SDK v5's native `embed` and `embedMany`.
 * Generates vector representations of text for semantic search and RAG.
 *
 * @module tools/embeddings
 */
import type { EmbeddingModel } from 'ai';
import { z } from 'zod';
type CoreTool = {
    description?: string;
    inputSchema: z.ZodSchema<any>;
    execute: (args: any, context?: any) => Promise<any> | any;
};
/**
 * Single embedding generation options
 */
export interface GenerateEmbeddingOptions {
    /**
     * The embedding model to use
     * Examples: 'text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002'
     */
    model: EmbeddingModel<string>;
    /**
     * Text to generate embedding for
     */
    value: string;
    /**
     * Additional provider-specific options
     */
    providerOptions?: Record<string, any>;
}
/**
 * Batch embedding generation options
 */
export interface GenerateEmbeddingsOptions {
    /**
     * The embedding model to use
     */
    model: EmbeddingModel<string>;
    /**
     * Array of texts to generate embeddings for
     */
    values: string[];
    /**
     * Additional provider-specific options
     */
    providerOptions?: Record<string, any>;
}
/**
 * Embedding result
 */
export interface EmbeddingResult {
    /**
     * The embedding vector
     */
    embedding: number[];
    /**
     * Dimensions of the embedding vector
     */
    dimensions: number;
    /**
     * Token usage for generating this embedding
     */
    usage?: {
        tokens: number;
    };
}
/**
 * Batch embeddings result
 */
export interface EmbeddingsResult {
    /**
     * Array of embedding vectors
     */
    embeddings: number[][];
    /**
     * Dimensions of the embedding vectors
     */
    dimensions: number;
    /**
     * Total token usage
     */
    usage?: {
        tokens: number;
    };
}
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
export declare function generateEmbeddingAI(options: GenerateEmbeddingOptions): Promise<EmbeddingResult>;
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
export declare function generateEmbeddingsAI(options: GenerateEmbeddingsOptions): Promise<EmbeddingsResult>;
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
export declare function cosineSimilarity(embedding1: number[], embedding2: number[]): number;
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
export declare function createEmbeddingTool(model: EmbeddingModel<string>): CoreTool;
export {};
//# sourceMappingURL=generate-embeddings.d.ts.map