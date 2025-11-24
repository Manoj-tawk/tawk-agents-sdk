/**
 * Reranking Feature
 * 
 * Provides document reranking capabilities using AI SDK v5's native `rerank`.
 * Reranking improves search relevance by reordering documents based on their relationship to a query.
 * 
 * @module tools/rerank
 */

// Reranking is an AI SDK v6 feature
// We'll use dynamic import to handle cases where it's not available
import { z } from 'zod';

// Try to import rerank from AI SDK (v6) or use a fallback
let rerank: any;
let RerankingModel: any;

try {
  // Try to import from 'ai' package (v6)
  const aiModule = require('ai');
  if (aiModule.rerank) {
    rerank = aiModule.rerank;
    RerankingModel = aiModule.RerankingModel || (() => {});
  } else {
    // Fallback: try local AI SDK v6
    try {
      rerank = require('../../../../ai/packages/ai/src/rerank').rerank;
      RerankingModel = require('../../../../ai/packages/ai/src/types').RerankingModel;
    } catch {
      // Reranking not available
      rerank = null;
      RerankingModel = () => {};
    }
  }
} catch {
  // AI SDK not available or doesn't have rerank
  rerank = null;
  RerankingModel = () => {}; // eslint-disable-line @typescript-eslint/no-unused-vars
}

// Tool definition type (AI SDK v5 compatible)
type CoreTool = {
  description?: string;
  inputSchema: z.ZodSchema<any>;
  execute: (args: any, context?: any) => Promise<any> | any;
};

/**
 * Reranking options
 */
export interface RerankOptions {
  /**
   * The reranking model to use
   * Examples: cohere.reranking('rerank-v3.5'), bedrock.reranking('cohere.rerank-v3-5:0')
   * Note: Requires AI SDK v6 or a reranking model provider (e.g., @ai-sdk/cohere)
   */
  model: any;
  
  /**
   * The documents to rerank (can be strings or objects)
   */
  documents: Array<string | Record<string, any>>;
  
  /**
   * The search query to rank documents against
   */
  query: string;
  
  /**
   * Maximum number of top documents to return
   * If not specified, all documents are returned
   */
  topN?: number;
  
  /**
   * Maximum number of retries. Set to 0 to disable retries. Default: 2
   */
  maxRetries?: number;
  
  /**
   * Additional provider-specific options
   */
  providerOptions?: Record<string, any>;
}

/**
 * Reranking result
 */
export interface RerankResult {
  /**
   * Sorted array of ranking results with originalIndex, score, and document
   */
  ranking: Array<{
    originalIndex: number;
    score: number;
    document: string | Record<string, any>;
  }>;
  
  /**
   * Documents sorted by relevance (convenience property)
   */
  rerankedDocuments: Array<string | Record<string, any>>;
  
  /**
   * Original documents array
   */
  originalDocuments: Array<string | Record<string, any>>;
  
  /**
   * Usage information
   */
  usage?: {
    tokens?: number;
  };
}

/**
 * Rerank documents based on their relevance to a query
 * 
 * @example
 * ```typescript
 * import { rerankDocuments } from '@tawk-agents-sdk/core';
 * import { cohere } from '@ai-sdk/cohere';
 * 
 * const result = await rerankDocuments({
 *   model: cohere.reranking('rerank-v3.5'),
 *   documents: [
 *     'sunny day at the beach',
 *     'rainy afternoon in the city',
 *     'snowy night in the mountains',
 *   ],
 *   query: 'talk about rain',
 *   topN: 2
 * });
 * 
 * console.log(result.ranking);
 * // [
 * //   { originalIndex: 1, score: 0.9, document: 'rainy afternoon in the city' },
 * //   { originalIndex: 0, score: 0.3, document: 'sunny day at the beach' }
 * // ]
 * ```
 * 
 * @example
 * ```typescript
 * // With structured documents
 * const result = await rerankDocuments({
 *   model: cohere.reranking('rerank-v3.5'),
 *   documents: [
 *     { from: 'Paul Doe', subject: 'Follow-up', text: '...' },
 *     { from: 'John McGill', subject: 'Missing Info', text: '...' },
 *   ],
 *   query: 'Which pricing did we get from Oracle?',
 *   topN: 1
 * });
 * 
 * console.log(result.rerankedDocuments[0]);
 * // { from: 'John McGill', subject: 'Missing Info', text: '...' }
 * ```
 */
export async function rerankDocuments(
  options: RerankOptions
): Promise<RerankResult> {
  if (!rerank) {
    throw new Error(
      'Reranking is not available. Reranking requires AI SDK v6 or a reranking model provider.\n' +
      'Install: npm install @ai-sdk/cohere (or another reranking provider)\n' +
      'Or upgrade to AI SDK v6 when available.'
    );
  }
  
  const { model, documents, query, topN, maxRetries, providerOptions } = options;
  
  const result = await rerank({
    model,
    documents,
    query,
    topN,
    maxRetries,
    providerOptions,
  });
  
  return {
    ranking: result.ranking.map((item: any) => ({
      originalIndex: item.originalIndex,
      score: item.score,
      document: item.document,
    })),
    rerankedDocuments: result.rerankedDocuments,
    originalDocuments: result.originalDocuments,
    usage: result.response?.usage ? { tokens: result.response.usage.tokens } : undefined,
  };
}

/**
 * Create a reranking tool for use in agents
 * 
 * @param model - The reranking model to use
 * 
 * @example
 * ```typescript
 * import { Agent, createRerankTool } from '@tawk-agents-sdk/core';
 * import { cohere } from '@ai-sdk/cohere';
 * 
 * const agent = new Agent({
 *   name: 'search-assistant',
 *   instructions: 'You can rerank search results to find the most relevant documents',
 *   tools: {
 *     rerank: createRerankTool(cohere.reranking('rerank-v3.5'))
 *   }
 * });
 * 
 * // Agent can now use rerank tool to improve search results
 * const result = await run(agent, 'Find documents about pricing');
 * ```
 */
export function createRerankTool(
  model: any
): CoreTool {
  if (!rerank) {
    throw new Error(
      'Reranking is not available. Reranking requires AI SDK v6 or a reranking model provider.\n' +
      'Install: npm install @ai-sdk/cohere (or another reranking provider)\n' +
      'Or upgrade to AI SDK v6 when available.'
    );
  }
  
  return {
    description: 'Rerank documents based on their relevance to a query. Returns documents sorted by relevance score. Ideal for improving search results by reordering documents based on semantic understanding.',
    inputSchema: z.object({
      documents: z.array(z.union([
        z.string(),
        z.record(z.any())
      ])).describe('Array of documents to rerank. Can be strings or objects.'),
      query: z.string().describe('The search query to rank documents against'),
      topN: z.number().optional().describe('Maximum number of top documents to return. If not specified, all documents are returned.'),
    }),
    execute: async ({ documents, query, topN }: { 
      documents: Array<string | Record<string, any>>; 
      query: string; 
      topN?: number;
    }) => {
      const result = await rerankDocuments({
        model,
        documents,
        query,
        topN,
      });
      
      return {
        success: true,
        ranking: result.ranking,
        rerankedDocuments: result.rerankedDocuments,
        topN: topN || result.ranking.length,
        totalDocuments: result.originalDocuments.length,
        usage: result.usage,
      };
    },
  };
}

