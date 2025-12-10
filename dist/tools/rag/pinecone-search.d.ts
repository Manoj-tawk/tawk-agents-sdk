/**
 * Pinecone RAG Search Tool
 *
 * Optimized, reusable tool for semantic search across Pinecone vector database.
 * Supports query embedding caching and TOON encoding for token efficiency.
 *
 * @module tools/rag/pinecone-search
 */
import type { EmbeddingModel } from 'ai';
/**
 * Document structure returned by search
 */
export interface SearchDocument {
    id: string;
    text: string;
    score: number;
    metadata?: Record<string, unknown>;
}
/**
 * Search result structure
 */
export interface PineconeSearchResult {
    documents: SearchDocument[];
    context: string;
    documentIds: string[];
    totalResults: number;
}
/**
 * Configuration for Pinecone search tool
 */
export interface PineconeSearchConfig {
    /** Pinecone index URL */
    indexUrl: string;
    /** Pinecone API key */
    apiKey: string;
    /** Namespace (default: 'default') */
    namespace?: string;
    /** API version (default: '2025-10') */
    apiVersion?: string;
    /** Embedding model for query encoding (supports OpenAI, Anthropic, Google, Mistral, etc.) */
    embeddingModel: EmbeddingModel<string>;
    /** Provider-specific options for embedding generation (e.g., { openai: { dimensions: 1024 } }) */
    embeddingProviderOptions?: Record<string, any>;
    /** Optional default metadata filter for Pinecone queries (e.g., { category: { $eq: 'technical' } }) */
    metadataFilter?: Record<string, any>;
    /** Enable TOON encoding for results (default: true) */
    useTOON?: boolean;
    /** Minimum document count or size threshold for TOON encoding (default: 3 documents or 500 chars) */
    toonThreshold?: {
        minDocuments?: number;
        minSizeChars?: number;
    };
    /** Custom logger function (optional) */
    logger?: (message: string, ...args: any[]) => void;
    /** Enable embedding cache (default: true) */
    enableCache?: boolean;
    /** Custom cache key generator (optional) */
    cacheKeyGenerator?: (query: string) => string;
}
/**
 * Create an optimized Pinecone search tool
 *
 * Features:
 * - Multi-provider embedding support (OpenAI, Anthropic, Google, Mistral, etc.)
 * - Query embedding caching (configurable)
 * - TOON encoding for token efficiency (configurable thresholds)
 * - Generic metadata filtering support
 * - Fully configurable for any use case
 *
 * @param config - Pinecone search configuration
 * @returns Tool definition ready for use in agents
 *
 * @example
 * ```typescript
 * // Using OpenAI embeddings
 * import { openai } from '@ai-sdk/openai';
 * import { createPineconeSearchTool } from '@tawk-agents-sdk/tools';
 *
 * const searchTool = createPineconeSearchTool({
 *   indexUrl: process.env.PINECONE_INDEX_URL!,
 *   apiKey: process.env.PINECONE_API_KEY!,
 *   embeddingModel: openai.embedding('text-embedding-3-large'),
 *   namespace: 'my-namespace',
 *   useTOON: true,
 * });
 *
 * @example
 * ```typescript
 * // Using Anthropic embeddings
 * import { anthropic } from '@ai-sdk/anthropic';
 *
 * const searchTool = createPineconeSearchTool({
 *   indexUrl: process.env.PINECONE_INDEX_URL!,
 *   apiKey: process.env.PINECONE_API_KEY!,
 *   embeddingModel: anthropic.embedding('text-embedding-3'),
 *   useTOON: true,
 * });
 *
 * @example
 * ```typescript
 * // Using Google embeddings
 * import { google } from '@ai-sdk/google';
 *
 * const searchTool = createPineconeSearchTool({
 *   indexUrl: process.env.PINECONE_INDEX_URL!,
 *   apiKey: process.env.PINECONE_API_KEY!,
 *   embeddingModel: google.embedding('text-embedding-004'),
 *   useTOON: true,
 *   enableCache: true,
 *   toonThreshold: { minDocuments: 5, minSizeChars: 1000 },
 * });
 *
 * @example
 * ```typescript
 * // Custom configuration with metadata filtering
 * const searchTool = createPineconeSearchTool({
 *   indexUrl: process.env.PINECONE_INDEX_URL!,
 *   apiKey: process.env.PINECONE_API_KEY!,
 *   embeddingModel: openai.embedding('text-embedding-3-small'),
 *   namespace: 'production',
 *   metadataFilter: { status: { $eq: 'published' } },
 *   useTOON: true,
 *   enableCache: true,
 *   cacheKeyGenerator: (query) => `embed_${query.toLowerCase().trim()}`,
 *   logger: (msg, ...args) => console.log(`[Pinecone] ${msg}`, ...args),
 * });
 * ```
 */
export declare function createPineconeSearchTool(config: PineconeSearchConfig): import("../..").CoreTool;
/**
 * Cache management utilities
 *
 * Note: Each tool instance has its own cache. To clear a specific tool's cache,
 * you would need access to the tool instance. For testing, create a new tool instance.
 */
export interface PineconeSearchToolInstance {
    clearCache: () => void;
    getCacheSize: () => number;
}
/**
 * Create a Pinecone search tool with cache management
 *
 * Returns both the tool and cache management utilities.
 *
 * @example
 * ```typescript
 * const { tool, clearCache, getCacheSize } = createPineconeSearchToolWithCache({
 *   indexUrl: process.env.PINECONE_INDEX_URL!,
 *   apiKey: process.env.PINECONE_API_KEY!,
 *   embeddingModel: openai.embedding('text-embedding-3-large'),
 * });
 *
 * // Use the tool
 * const agent = new Agent({
 *   name: 'RAG Agent',
 *   tools: { search: tool },
 * });
 *
 * // Manage cache
 * console.log(`Cache size: ${getCacheSize()}`);
 * clearCache();
 * ```
 */
export declare function createPineconeSearchToolWithCache(config: PineconeSearchConfig): {
    tool: ReturnType<typeof createPineconeSearchTool>;
    clearCache: () => void;
    getCacheSize: () => number;
};
//# sourceMappingURL=pinecone-search.d.ts.map