"use strict";
/**
 * Pinecone RAG Search Tool
 *
 * Optimized, reusable tool for semantic search across Pinecone vector database.
 * Supports query embedding caching and TOON encoding for token efficiency.
 *
 * @module tools/rag/pinecone-search
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPineconeSearchTool = createPineconeSearchTool;
exports.createPineconeSearchToolWithCache = createPineconeSearchToolWithCache;
const core_1 = require("../../core");
const embeddings_1 = require("../embeddings");
const toon_1 = require("../../helpers/toon");
const zod_1 = require("zod");
/**
 * Query embedding cache to avoid redundant API calls
 */
class QueryEmbeddingCache {
    constructor(enabled = true, cacheKeyGenerator) {
        this.cache = new Map();
        this.enabled = enabled;
        this.cacheKeyGenerator = cacheKeyGenerator;
    }
    async getEmbedding(query, embeddingModel, providerOptions) {
        if (!this.enabled) {
            // Cache disabled, generate embedding directly
            const result = await (0, embeddings_1.generateEmbeddingAI)({
                model: embeddingModel,
                value: query,
                providerOptions,
            });
            return result.embedding;
        }
        // Generate cache key
        const cacheKey = this.cacheKeyGenerator
            ? this.cacheKeyGenerator(query)
            : query.toLowerCase().trim();
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        const result = await (0, embeddings_1.generateEmbeddingAI)({
            model: embeddingModel,
            value: query,
            providerOptions,
        });
        this.cache.set(cacheKey, result.embedding);
        return result.embedding;
    }
    clear() {
        this.cache.clear();
    }
    get size() {
        return this.cache.size;
    }
}
/**
 * Pinecone search function
 */
async function searchPinecone(queryEmbedding, topK, config) {
    if (!config.indexUrl || !config.apiKey) {
        throw new Error('Pinecone configuration missing. Please set indexUrl and apiKey');
    }
    const requestBody = {
        vector: queryEmbedding,
        namespace: config.namespace || 'default',
        topK,
        includeMetadata: true,
        includeValues: false,
    };
    // Add optional metadata filter if provided
    if (config.metadataFilter) {
        requestBody.filter = config.metadataFilter;
    }
    const response = await fetch(`${config.indexUrl}/query`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Api-Key': config.apiKey,
            'X-Pinecone-Api-Version': config.apiVersion || '2025-10',
        },
        body: JSON.stringify(requestBody),
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Pinecone query failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    const data = await response.json();
    const { matches } = data;
    return matches.map((match) => ({
        doc: {
            id: match.id,
            text: match.metadata?.text || '',
            score: match.score || 0,
            metadata: match.metadata,
        },
        score: match.score || 0,
    }));
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
function createPineconeSearchTool(config) {
    const useTOON = config.useTOON !== false; // Default to true
    const enableCache = config.enableCache !== false; // Default to true
    const logger = config.logger || console.log;
    const toonThreshold = config.toonThreshold || { minDocuments: 3, minSizeChars: 500 };
    const embeddingCache = new QueryEmbeddingCache(enableCache, config.cacheKeyGenerator);
    return (0, core_1.tool)({
        description: 'Search knowledge base using Pinecone semantic similarity. Returns top results ranked by relevance score. Supports any embedding model provider (OpenAI, Anthropic, Google, Mistral, etc.).',
        inputSchema: zod_1.z.object({
            query: zod_1.z.string().describe('Search query'),
            topK: zod_1.z.number().default(5).describe('Number of results to return'),
            metadataFilter: zod_1.z.record(zod_1.z.any()).optional().describe('Optional metadata filter for Pinecone queries (e.g., { category: { $eq: "technical" } })'),
        }),
        execute: async ({ query, topK, metadataFilter }) => {
            // ✅ OPTIMIZED: Use cached query embedding (if enabled)
            // Pass provider options if specified (e.g., { openai: { dimensions: 1024 } })
            const queryEmbedding = await embeddingCache.getEmbedding(query, config.embeddingModel, config.embeddingProviderOptions);
            // Use query-specific metadata filter if provided, otherwise use config default
            const searchConfig = {
                ...config,
                metadataFilter: metadataFilter || config.metadataFilter,
            };
            // Search Pinecone
            const results = await searchPinecone(queryEmbedding, topK, searchConfig);
            logger(`   🔍 Found ${results.length} documents`);
            results.forEach((r, i) => {
                logger(`      ${i + 1}. [${r.doc.id}] Score: ${r.score.toFixed(4)}`);
            });
            const result = {
                documents: results.map(r => r.doc),
                context: results.map(r => r.doc.text).join('\n\n'),
                documentIds: results.map(r => r.doc.id),
                totalResults: results.length,
            };
            // ✅ OPTIMIZED: Encode to TOON if enabled and result meets threshold
            const shouldEncodeTOON = useTOON && (result.documents.length >= (toonThreshold.minDocuments || 3) ||
                JSON.stringify(result.documents).length > (toonThreshold.minSizeChars || 500));
            if (shouldEncodeTOON) {
                try {
                    // Encode documents array to TOON for token efficiency
                    const toonDocuments = (0, toon_1.encodeTOON)(result.documents);
                    return {
                        ...result,
                        documentsTOON: toonDocuments, // Provide both formats for flexibility
                        _toonEncoded: true,
                    };
                }
                catch (error) {
                    // Fallback to JSON if TOON encoding fails
                    logger(`   ⚠️  TOON encoding failed, using JSON: ${error}`);
                    return result;
                }
            }
            return result;
        },
    });
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
function createPineconeSearchToolWithCache(config) {
    const useTOON = config.useTOON !== false;
    const enableCache = config.enableCache !== false;
    const logger = config.logger || console.log;
    const toonThreshold = config.toonThreshold || { minDocuments: 3, minSizeChars: 500 };
    const embeddingCache = new QueryEmbeddingCache(enableCache, config.cacheKeyGenerator);
    const toolInstance = (0, core_1.tool)({
        description: 'Search knowledge base using Pinecone semantic similarity. Returns top results ranked by relevance score. Supports any embedding model provider (OpenAI, Anthropic, Google, Mistral, etc.).',
        inputSchema: zod_1.z.object({
            query: zod_1.z.string().describe('Search query'),
            topK: zod_1.z.number().default(5).describe('Number of results to return'),
            metadataFilter: zod_1.z.record(zod_1.z.any()).optional().describe('Optional metadata filter for Pinecone queries (e.g., { category: { $eq: "technical" } })'),
        }),
        execute: async ({ query, topK, metadataFilter }) => {
            // Pass provider options if specified (e.g., { openai: { dimensions: 1024 } })
            const queryEmbedding = await embeddingCache.getEmbedding(query, config.embeddingModel, config.embeddingProviderOptions);
            const searchConfig = {
                ...config,
                metadataFilter: metadataFilter || config.metadataFilter,
            };
            const results = await searchPinecone(queryEmbedding, topK, searchConfig);
            logger(`   🔍 Found ${results.length} documents`);
            results.forEach((r, i) => {
                logger(`      ${i + 1}. [${r.doc.id}] Score: ${r.score.toFixed(4)}`);
            });
            const result = {
                documents: results.map(r => r.doc),
                context: results.map(r => r.doc.text).join('\n\n'),
                documentIds: results.map(r => r.doc.id),
                totalResults: results.length,
            };
            const shouldEncodeTOON = useTOON && (result.documents.length >= (toonThreshold.minDocuments || 3) ||
                JSON.stringify(result.documents).length > (toonThreshold.minSizeChars || 500));
            if (shouldEncodeTOON) {
                try {
                    const toonDocuments = (0, toon_1.encodeTOON)(result.documents);
                    return {
                        ...result,
                        documentsTOON: toonDocuments,
                        _toonEncoded: true,
                    };
                }
                catch (error) {
                    logger(`   ⚠️  TOON encoding failed, using JSON: ${error}`);
                    return result;
                }
            }
            return result;
        },
    });
    return {
        tool: toolInstance,
        clearCache: () => embeddingCache.clear(),
        getCacheSize: () => embeddingCache.size,
    };
}
//# sourceMappingURL=pinecone-search.js.map