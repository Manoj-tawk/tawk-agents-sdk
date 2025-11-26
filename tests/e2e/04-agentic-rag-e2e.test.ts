/**
 * E2E TEST 04: Agentic RAG (Retrieval-Augmented Generation) with Multi-Agent Workflow
 * 
 * @fileoverview
 * This test demonstrates a production-ready agentic RAG system using pure agent orchestration.
 * All routing, coordination, and workflow management happens through SDK handoffs - no hardcoded logic.
 * 
 * Architecture (Pure Agent Handoffs):
 * 1. QueryRouter Agent - Analyzes queries and routes to specialist agents via handoffs
 * 2. Retrieval Agents (Technical, General, Domain) - Perform semantic search and hand off to Synthesis
 * 3. Synthesis Agent - Combines contexts, re-ranks documents, and hands off to Response
 * 4. Response Agent - Generates final answer with citations (final agent, no handoffs)
 * 
 * Features:
 * - Pure agent orchestration via SDK handoffs
 * - Semantic search with embeddings
 * - Document re-ranking
 * - Multi-domain query handling
 * - Context synthesis from multiple sources
 * - Citation tracking
 * 
 * Requirements:
 * - ANTHROPIC_API_KEY in .env (for Claude models - main agent)
 * - OPENAI_API_KEY in .env (for embeddings - optional, may be needed)
 * - Network connection
 * 
 * @example
 * ```bash
 * npx ts-node tests/e2e/04-agentic-rag-e2e.test.ts
 * ```
 */

import 'dotenv/config';
import {
  Agent,
  run,
  tool,
  setDefaultModel,
  generateEmbeddingAI,
  generateEmbeddingsAI,
  cosineSimilarity,
  lengthGuardrail,
  piiDetectionGuardrail,
} from '../../src';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

// Set model - Using Claude's latest model (claude-3-5-sonnet-20241022)
setDefaultModel(anthropic('claude-sonnet-4-5-20250929'));
// setDefaultModel(openai('gpt-5.1'));

console.log('\n🧪 E2E TEST 04: Agentic RAG with Multi-Agent Workflow\n');
console.log('⚠️  This test makes REAL API calls and costs money!\n');

// ============================================
// TYPES & INTERFACES
// ============================================

/**
 * Document structure for the knowledge base
 */
interface Document {
  id: string;
  text: string;
  domain: 'technical' | 'general' | 'domain';
  embedding?: number[];
}

/**
 * Result structure for agentic RAG queries
 */
interface AgenticRAGResult {
  answer: string;
  citations: string[];
  handoffChain: string[];
  totalTokens: number;
  latency: number;
  agentsUsed: string[];
}

// ============================================
// KNOWLEDGE BASE SETUP
// ============================================

/**
 * Sample knowledge base with documents across three domains:
 * - Technical: Code, frameworks, APIs
 * - General: General knowledge and definitions
 * - Domain: SDK and company-specific information
 */
const knowledgeBase: Document[] = [
  // Technical documents
  { id: 'tech-1', domain: 'technical', text: 'TypeScript is a typed superset of JavaScript that compiles to plain JavaScript. It adds static type definitions to JavaScript, enabling better tooling and error detection.' },
  { id: 'tech-2', domain: 'technical', text: 'Next.js is a React framework for production. It provides server-side rendering, static site generation, and API routes out of the box.' },
  { id: 'tech-3', domain: 'technical', text: 'React is a JavaScript library for building user interfaces. It uses a component-based architecture and virtual DOM for efficient updates.' },
  { id: 'tech-4', domain: 'technical', text: 'Authentication in web applications typically involves JWT tokens, session management, and OAuth protocols. Next.js supports multiple authentication strategies.' },
  { id: 'tech-5', domain: 'technical', text: 'TypeScript provides interfaces, classes, and type inference. It helps catch errors at compile time rather than runtime.' },
  
  // General knowledge documents
  { id: 'gen-1', domain: 'general', text: 'JavaScript is a high-level programming language that is one of the core technologies of the World Wide Web. It enables interactive web pages.' },
  { id: 'gen-2', domain: 'general', text: 'Programming languages can be categorized as compiled or interpreted. JavaScript is interpreted, while TypeScript is compiled to JavaScript.' },
  { id: 'gen-3', domain: 'general', text: 'Web frameworks simplify development by providing structure and common patterns. Popular frameworks include React, Vue, and Angular.' },
  
  // Domain-specific documents
  { id: 'dom-1', domain: 'domain', text: 'Tawk Agents SDK provides AI agent capabilities with multi-agent orchestration, tool calling, and guardrails. It supports embeddings, image generation, and audio processing.' },
  { id: 'dom-2', domain: 'domain', text: 'The SDK supports handoffs between agents, allowing specialized agents to handle specific tasks. This enables complex workflows and better task distribution.' },
];

/**
 * In-memory vector store for semantic search
 * 
 * Groups documents by domain and provides semantic search using cosine similarity.
 * Used by retrieval agents to find relevant documents.
 */
class VectorStore {
  private documents: Map<string, Document[]>;

  constructor() {
    this.documents = new Map();
    // Group documents by domain for efficient retrieval
    for (const doc of knowledgeBase) {
      if (!this.documents.has(doc.domain)) {
        this.documents.set(doc.domain, []);
      }
      this.documents.get(doc.domain)!.push(doc);
    }
  }

  /**
   * Search for documents using semantic similarity
   * 
   * @param queryEmbedding - Query embedding vector
   * @param domain - Domain to search in ('technical' | 'general' | 'domain')
   * @param topK - Number of top results to return (default: 5)
   * @returns Array of documents with similarity scores, sorted by relevance
   */
  async search(
    queryEmbedding: number[],
    domain: string,
    topK: number = 5
  ): Promise<Array<{ doc: Document; score: number }>> {
    const domainDocs = this.documents.get(domain) || [];
    
    const results = domainDocs
      .filter(doc => doc.embedding)
      .map(doc => ({
        doc,
        score: cosineSimilarity(queryEmbedding, doc.embedding!),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return results;
  }

  /**
   * Get a document by ID
   * 
   * @param id - Document ID
   * @returns Document or undefined if not found
   */
  getDocument(id: string): Document | undefined {
    return knowledgeBase.find(doc => doc.id === id);
  }
}

const vectorStore = new VectorStore();

// ============================================
// OPTIMIZATION: Query Embedding Cache
// ============================================

/**
 * Shared query embedding cache to avoid redundant API calls
 * 
 * When multiple retrieval agents are called, they all need the same query embedding.
 * This cache ensures we only generate it once and share it across all agents.
 */
class QueryEmbeddingCache {
  private cache = new Map<string, number[]>();
  private embeddingModel = openai.embedding('text-embedding-3-small');

  /**
   * Get embedding for a query (cached)
   * 
   * @param query - Query text
   * @returns Query embedding vector
   */
  async getEmbedding(query: string): Promise<number[]> {
    const cacheKey = query.toLowerCase().trim();
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const result = await generateEmbeddingAI({
      model: this.embeddingModel,
      value: query,
    });
    
    this.cache.set(cacheKey, result.embedding);
    return result.embedding;
  }

  /**
   * Clear the cache
   */
  clear(): void {
    this.cache.clear();
  }
}

const queryEmbeddingCache = new QueryEmbeddingCache();

// ============================================
// AGENT DEFINITIONS
// ============================================

/**
 * Technical Retrieval Agent
 * 
 * Specializes in retrieving technical documentation about code, frameworks, and APIs.
 * Uses semantic search to find relevant documents and hands off to Synthesis Agent.
 */
const technicalRetrievalAgent = new Agent({
  name: 'TechnicalRetrieval',
  instructions: `You are a technical documentation retrieval specialist.

CRITICAL: You must:
1. Call searchKnowledgeBase tool ONCE with the query
2. Immediately hand off to Synthesis Agent with the results
3. DO NOT make multiple tool calls or ask questions

Your job is ONLY to retrieve and hand off. Be fast and direct.`,
  tools: {
    searchKnowledgeBase: tool({
      description: 'Search technical knowledge base using semantic similarity. Call this once with the query.',
      inputSchema: z.object({
        query: z.string().describe('Search query'),
        topK: z.number().default(5).describe('Number of results to return'),
      }),
      execute: async ({ query, topK }) => {
        // ✅ OPTIMIZED: Use cached query embedding (shared across agents)
        const queryEmbedding = await queryEmbeddingCache.getEmbedding(query);

        const results = await vectorStore.search(queryEmbedding, 'technical', topK);
        
        console.log(`   🔍 Technical: Found ${results.length} documents`);
        results.forEach((r, i) => {
          console.log(`      ${i + 1}. [${r.doc.id}] Score: ${r.score.toFixed(4)}`);
        });

        return {
          documents: results.map(r => ({
            id: r.doc.id,
            text: r.doc.text,
            score: r.score,
          })),
          context: results.map(r => r.doc.text).join('\n\n'),
          documentIds: results.map(r => r.doc.id),
        };
      },
    }),
  },
  handoffDescription: 'Handles technical queries about code, frameworks, and APIs',
  useTOON: true // Enable TOON encoding
});

/**
 * General Knowledge Retrieval Agent
 * 
 * Specializes in retrieving general knowledge and definitions.
 * Uses semantic search to find relevant documents and hands off to Synthesis Agent.
 */
const generalRetrievalAgent = new Agent({
  name: 'GeneralKnowledge',
  instructions: `You are a general knowledge retrieval specialist.

CRITICAL: You must:
1. Call searchKnowledgeBase tool ONCE with the query
2. Immediately hand off to Synthesis Agent with the results
3. DO NOT make multiple tool calls or ask questions

Your job is ONLY to retrieve and hand off. Be fast and direct.`,
  tools: {
    searchKnowledgeBase: tool({
      description: 'Search general knowledge base using semantic similarity. Call this once with the query.',
      inputSchema: z.object({
        query: z.string().describe('Search query'),
        topK: z.number().default(5).describe('Number of results to return'),
      }),
      execute: async ({ query, topK }) => {
        // ✅ OPTIMIZED: Use cached query embedding (shared across agents)
        const queryEmbedding = await queryEmbeddingCache.getEmbedding(query);

        const results = await vectorStore.search(queryEmbedding, 'general', topK);
        
        console.log(`   🔍 General: Found ${results.length} documents`);
        results.forEach((r, i) => {
          console.log(`      ${i + 1}. [${r.doc.id}] Score: ${r.score.toFixed(4)}`);
        });

        return {
          documents: results.map(r => ({
            id: r.doc.id,
            text: r.doc.text,
            score: r.score,
          })),
          context: results.map(r => r.doc.text).join('\n\n'),
          documentIds: results.map(r => r.doc.id),
        };
      },
    }),
  },
  handoffDescription: 'Handles general knowledge queries and definitions',
  useTOON: true // Enable TOON encoding
});

/**
 * Domain-Specific Retrieval Agent
 * 
 * Specializes in retrieving domain-specific information about the SDK and company.
 * Uses semantic search to find relevant documents and hands off to Synthesis Agent.
 */
const domainRetrievalAgent = new Agent({
  name: 'DomainRetrieval',
  instructions: `You are a domain-specific knowledge retrieval specialist.

CRITICAL: You must:
1. Call searchKnowledgeBase tool ONCE with the query
2. Immediately hand off to Synthesis Agent with the results
3. DO NOT make multiple tool calls or ask questions

Your job is ONLY to retrieve and hand off. Be fast and direct.`,
  tools: {
    searchKnowledgeBase: tool({
      description: 'Search domain-specific knowledge base using semantic similarity. Call this once with the query.',
      inputSchema: z.object({
        query: z.string().describe('Search query'),
        topK: z.number().default(5).describe('Number of results to return'),
      }),
      execute: async ({ query, topK }) => {
        // ✅ OPTIMIZED: Use cached query embedding (shared across agents)
        const queryEmbedding = await queryEmbeddingCache.getEmbedding(query);

        const results = await vectorStore.search(queryEmbedding, 'domain', topK);
        
        console.log(`   🔍 Domain: Found ${results.length} documents`);
        results.forEach((r, i) => {
          console.log(`      ${i + 1}. [${r.doc.id}] Score: ${r.score.toFixed(4)}`);
        });

        return {
          documents: results.map(r => ({
            id: r.doc.id,
            text: r.doc.text,
            score: r.score,
          })),
          context: results.map(r => r.doc.text).join('\n\n'),
          documentIds: results.map(r => r.doc.id),
        };
      },
    }),
  },
  handoffDescription: 'Handles domain-specific queries about SDK and company-specific information',
  useTOON: true // Enable TOON encoding
});

/**
 * Synthesis Agent
 * 
 * Coordinates information from multiple retrieval agents.
 * Re-ranks documents, removes duplicates, and consolidates contexts.
 * Hands off to Response Agent after synthesis.
 */
const synthesisAgent = new Agent({
  name: 'Synthesis',
  instructions: `You are a synthesis agent that combines information from multiple sources.

CRITICAL: You must:
1. Use rerankDocuments tool to re-rank documents by relevance
2. Use synthesizeContext tool to combine multiple contexts (if needed)
3. Immediately hand off to Response Agent with the synthesized context
4. DO NOT make multiple passes or ask questions

Be fast and efficient. Your job is to combine and hand off quickly.`,
  tools: {
    rerankDocuments: tool({
      description: 'Re-rank documents by relevance to the query',
      inputSchema: z.object({
        query: z.string().describe('Original query'),
        documents: z.array(z.object({
          id: z.string(),
          text: z.string(),
          score: z.number().optional(),
        })).describe('Documents to re-rank'),
      }),
      execute: async ({ query, documents }) => {
        console.log(`   🔄 Re-ranking ${documents.length} documents`);
        
        // Re-rank by score (simplified - full reranking requires AI SDK v6)
        // Sort by existing score or use original order
        const sorted = [...documents].sort((a, b) => (b.score || 0) - (a.score || 0));
        
        console.log(`   ✅ Re-ranked to ${sorted.length} documents`);
        sorted.forEach((r, i) => {
          console.log(`      ${i + 1}. [${r.id}] Score: ${r.score?.toFixed(4) || 'N/A'}`);
        });

        return {
          reranked: sorted,
          context: sorted.map(d => d.text).join('\n\n'),
          documentIds: sorted.map(d => d.id),
        };
      },
    }),
    synthesizeContext: tool({
      description: 'Combine and deduplicate multiple contexts',
      inputSchema: z.object({
        contexts: z.array(z.string()).describe('Contexts to combine'),
      }),
      execute: async ({ contexts }) => {
        // Remove duplicates and combine
        const uniqueContexts = [...new Set(contexts)];
        const combined = uniqueContexts.join('\n\n---\n\n');
        
        console.log(`   🔗 Synthesized ${contexts.length} contexts into one`);
        return {
          synthesized: combined,
          sourceCount: contexts.length,
        };
      },
    }),
  },
  useTOON: true // Enable TOON encoding
});

/**
 * Response Agent
 * 
 * Final agent in the chain. Generates concise, accurate answers with citations.
 * Applies guardrails for length and PII detection.
 * No handoffs - this is the terminal agent.
 */
const responseAgent = new Agent({
  name: 'Response',
  instructions: `You are a response agent that generates concise, accurate answers with citations.

IMPORTANT:
- Keep answers under 1500 characters
- Be concise and focused
- Include document IDs as citations in format [doc-id]
- Answer based ONLY on the provided context
- If context is insufficient, say so clearly

Format: Answer text with citations like [tech-1] [gen-2] at the end.`,
  guardrails: [
    lengthGuardrail({ type: 'output', maxLength: 1500, unit: 'characters' }),
    piiDetectionGuardrail({ type: 'output' }),
  ],
  useTOON: true // Enable TOON encoding
});

/**
 * Query Router Agent
 * 
 * Entry point for all queries. Analyzes queries and routes them to appropriate
 * specialist agents using SDK handoffs. This is pure agent orchestration - no
 * hardcoded routing logic. All routing decisions are made by the agent itself.
 */
const routerAgent = new Agent({
  name: 'QueryRouter',
  instructions: `You are a query router that classifies queries and routes them to appropriate specialist agents using handoffs.

CRITICAL: You must:
1. Quickly analyze the query (1 turn maximum)
2. Use logRouting tool to record your decision (optional, for visibility)
3. Immediately hand off to the appropriate specialist agent(s) using SDK handoffs
4. DO NOT try to answer queries yourself or ask clarifying questions

Classification rules:
- Technical queries (TypeScript, Next.js, React, code, APIs, frameworks, authentication) → Hand off to Technical Retrieval Agent
- General knowledge queries (what is, compare, difference, how does, performance) → Hand off to General Knowledge Agent
- Domain-specific queries (SDK, Tawk, agent) → Hand off to Domain Retrieval Agent
- Multi-domain queries → Hand off to multiple agents
- Ambiguous queries → Hand off to all relevant agents

Be fast and decisive. Route immediately without hesitation.`,
  tools: {
    logRouting: tool({
      description: 'Log routing decision for visibility and debugging',
      inputSchema: z.object({
        decision: z.string().describe('Routing decision explanation'),
        agents: z.array(z.string()).describe('Agent names being routed to'),
      }),
      execute: async ({ decision, agents }) => {
        console.log(`\n   🎯 Router Decision: ${decision}`);
        console.log(`   📍 Routing to: ${agents.join(', ')}`);
        return { logged: true, decision, agents };
      },
    }),
  },
  handoffs: [technicalRetrievalAgent, generalRetrievalAgent, domainRetrievalAgent],
  useTOON: true // Enable TOON encoding
});

// Configure handoff chain: Retrieval → Synthesis → Response
// This creates the agent workflow where each agent hands off to the next
technicalRetrievalAgent.handoffs = [synthesisAgent];
generalRetrievalAgent.handoffs = [synthesisAgent];
domainRetrievalAgent.handoffs = [synthesisAgent];
synthesisAgent.handoffs = [responseAgent];

// ============================================
// ORCHESTRATION FUNCTION
// ============================================

/**
 * Main orchestration function for agentic RAG
 * 
 * This function demonstrates pure agent orchestration - all routing and coordination
 * happens through SDK handoffs. The router agent analyzes the query and hands off
 * to appropriate retrieval agents, which then hand off to synthesis, which hands off
 * to response. No manual coordination or hardcoded logic.
 * 
 * @param query - User query to process
 * @returns AgenticRAGResult with answer, citations, handoff chain, and metrics
 * 
 * @example
 * ```typescript
 * const result = await agenticRAG('What is TypeScript?');
 * console.log(result.answer);
 * ```
 */
async function agenticRAG(query: string): Promise<AgenticRAGResult> {
  const startTime = Date.now();

  console.log(`\n📝 Query: "${query}"`);
  console.log('━'.repeat(80));
  console.log('🚀 Starting Agentic RAG - Pure agent orchestration via SDK handoffs\n');

  // Pure agent orchestration: Router → Retrieval Agent(s) → Synthesis → Response
  // All routing and coordination happens through SDK handoffs - no hardcoded logic
  // ✅ OPTIMIZED: Reduced maxTurns from 15 to 8 (workflow: Router 1-2, Retrieval 1-2, Synthesis 1-2, Response 1-2 = 4-8 turns)
  const result = await run(routerAgent, query, { maxTurns: 8 });

  // Extract handoff chain from metadata
  const handoffChain = result.metadata.handoffChain || [];
  const agentsUsed = [...new Set(handoffChain)];
  
  // Extract document IDs from tool calls across all steps
  const documentIds: string[] = [];
  const steps = (result as any).steps || [];
  for (const step of steps) {
    if (step.toolCalls) {
      for (const toolCall of step.toolCalls) {
        if (toolCall.toolName === 'searchKnowledgeBase' && toolCall.result) {
          const toolResult = toolCall.result;
          if (toolResult.documentIds) {
            documentIds.push(...toolResult.documentIds);
          } else if (toolResult.documents) {
            documentIds.push(
              ...toolResult.documents
                .map((d: any) => d.id || d.documentId)
                .filter(Boolean)
            );
          }
        }
      }
    }
  }

  const latency = Date.now() - startTime;

  return {
    answer: result.finalOutput,
    citations: [...new Set(documentIds.filter(Boolean))],
    handoffChain,
    totalTokens: result.metadata.totalTokens || 0,
    latency,
    agentsUsed,
  };
}

// ============================================
// TEST SCENARIOS
// ============================================

/**
 * Test Scenario 1: Simple Single-Domain Query
 * 
 * Tests routing to a single retrieval agent for a straightforward query.
 */
async function test1_SimpleSingleDomain() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 SCENARIO 1: Simple Single-Domain Query');
  console.log('='.repeat(80));

  const result = await agenticRAG('What is TypeScript?');

  console.log('\n✅ Results:');
  console.log(`📝 Answer: ${result.answer.substring(0, 200)}...`);
  console.log(`📚 Citations: ${result.citations.length} documents`);
  console.log(`🔄 Handoff Chain: ${result.handoffChain.join(' → ')}`);
  console.log(`🤖 Agents Used: ${result.agentsUsed.join(', ')}`);
  console.log(`📊 Tokens: ${result.totalTokens}`);
  console.log(`⏱️  Latency: ${result.latency}ms`);
  console.log(`💰 Cost: ~$${((result.totalTokens * 0.00015) / 1000).toFixed(6)}`);

  return result;
}

/**
 * Test Scenario 2: Multi-Domain Query
 * 
 * Tests routing to multiple retrieval agents for queries spanning multiple domains.
 */
async function test2_MultiDomain() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 SCENARIO 2: Multi-Domain Query');
  console.log('='.repeat(80));

  const result = await agenticRAG('How does TypeScript compare to JavaScript, and what are the performance implications?');

  console.log('\n✅ Results:');
  console.log(`📝 Answer: ${result.answer.substring(0, 200)}...`);
  console.log(`📚 Citations: ${result.citations.length} documents`);
  console.log(`🔄 Handoff Chain: ${result.handoffChain.join(' → ')}`);
  console.log(`🤖 Agents Used: ${result.agentsUsed.join(', ')}`);
  console.log(`📊 Tokens: ${result.totalTokens}`);
  console.log(`⏱️  Latency: ${result.latency}ms`);
  console.log(`💰 Cost: ~$${((result.totalTokens * 0.00015) / 1000).toFixed(6)}`);

  return result;
}

/**
 * Test Scenario 3: Ambiguous Query
 * 
 * Tests handling of ambiguous queries that could match multiple domains.
 */
async function test3_AmbiguousQuery() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 SCENARIO 3: Ambiguous Query');
  console.log('='.repeat(80));

  const result = await agenticRAG('Tell me about React');

  console.log('\n✅ Results:');
  console.log(`📝 Answer: ${result.answer.substring(0, 200)}...`);
  console.log(`📚 Citations: ${result.citations.length} documents`);
  console.log(`🔄 Handoff Chain: ${result.handoffChain.join(' → ')}`);
  console.log(`🤖 Agents Used: ${result.agentsUsed.join(', ')}`);
  console.log(`📊 Tokens: ${result.totalTokens}`);
  console.log(`⏱️  Latency: ${result.latency}ms`);
  console.log(`💰 Cost: ~$${((result.totalTokens * 0.00015) / 1000).toFixed(6)}`);

  return result;
}

/**
 * Test Scenario 4: Complex Multi-Step Query
 * 
 * Tests handling of complex queries requiring multiple retrieval agents and synthesis.
 */
async function test4_ComplexMultiStep() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 SCENARIO 4: Complex Multi-Step Query');
  console.log('='.repeat(80));

  const result = await agenticRAG('Explain how to implement authentication in a Next.js app using TypeScript, and compare it with alternative approaches');

  console.log('\n✅ Results:');
  console.log(`📝 Answer: ${result.answer.substring(0, 200)}...`);
  console.log(`📚 Citations: ${result.citations.length} documents`);
  console.log(`🔄 Handoff Chain: ${result.handoffChain.join(' → ')}`);
  console.log(`🤖 Agents Used: ${result.agentsUsed.join(', ')}`);
  console.log(`📊 Tokens: ${result.totalTokens}`);
  console.log(`⏱️  Latency: ${result.latency}ms`);
  console.log(`💰 Cost: ~$${((result.totalTokens * 0.00015) / 1000).toFixed(6)}`);

  return result;
}

/**
 * Test Scenario 5: Domain-Specific Query
 * 
 * Tests routing to domain-specific retrieval agent for SDK/company queries.
 */
async function test5_DomainSpecific() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 SCENARIO 5: Domain-Specific Query');
  console.log('='.repeat(80));

  const result = await agenticRAG('What features does the Tawk Agents SDK support?');

  console.log('\n✅ Results:');
  console.log(`📝 Answer: ${result.answer.substring(0, 200)}...`);
  console.log(`📚 Citations: ${result.citations.length} documents`);
  console.log(`🔄 Handoff Chain: ${result.handoffChain.join(' → ')}`);
  console.log(`🤖 Agents Used: ${result.agentsUsed.join(', ')}`);
  console.log(`📊 Tokens: ${result.totalTokens}`);
  console.log(`⏱️  Latency: ${result.latency}ms`);
  console.log(`💰 Cost: ~$${((result.totalTokens * 0.00015) / 1000).toFixed(6)}`);

  return result;
}

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize embeddings for all documents in the knowledge base
 * 
 * Generates embeddings for each document to enable semantic search.
 * This is a one-time setup that runs before tests.
 */
async function initializeEmbeddings(): Promise<void> {
  console.log('🔧 Initializing embeddings for knowledge base...');
  const embeddingModel = openai.embedding('text-embedding-3-small');

  // ✅ OPTIMIZED: Use batch processing (5x faster than individual calls)
  try {
    const texts = knowledgeBase.map(doc => doc.text);
    const result = await generateEmbeddingsAI({
      model: embeddingModel,
      values: texts,
    });

    // Assign embeddings to documents
    // result.embeddings is number[][] (array of embedding vectors)
    knowledgeBase.forEach((doc, i) => {
      doc.embedding = result.embeddings[i];
    });
  } catch (error) {
    console.error(`❌ Failed to generate embeddings:`, error);
    throw error;
  }

  console.log(`✅ Generated embeddings for ${knowledgeBase.length} documents (batch processed)\n`);
}

// ============================================
// TEST RUNNER
// ============================================

/**
 * Run all E2E test scenarios
 * 
 * Executes all 5 test scenarios and provides a summary with metrics.
 * Handles errors gracefully and exits with code 1 on failure.
 */
async function runAllTests(): Promise<void> {
  const startTime = Date.now();
  let totalCost = 0;
  let totalTokens = 0;

  try {
    // Initialize embeddings first
    await initializeEmbeddings();

    // Run all scenarios
    const result1 = await test1_SimpleSingleDomain();
    totalTokens += result1.totalTokens;
    totalCost += (result1.totalTokens * 0.00015) / 1000;

    const result2 = await test2_MultiDomain();
    totalTokens += result2.totalTokens;
    totalCost += (result2.totalTokens * 0.00015) / 1000;

    const result3 = await test3_AmbiguousQuery();
    totalTokens += result3.totalTokens;
    totalCost += (result3.totalTokens * 0.00015) / 1000;

    const result4 = await test4_ComplexMultiStep();
    totalTokens += result4.totalTokens;
    totalCost += (result4.totalTokens * 0.00015) / 1000;

    const result5 = await test5_DomainSpecific();
    totalTokens += result5.totalTokens;
    totalCost += (result5.totalTokens * 0.00015) / 1000;

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '━'.repeat(80));
    console.log('✅ ALL AGENTIC RAG E2E TESTS COMPLETED!');
    console.log('━'.repeat(80));
    console.log(`⏱️  Total Duration: ${duration}s`);
    console.log(`📊 Total Tokens: ${totalTokens}`);
    console.log(`💰 Total Cost: ~$${totalCost.toFixed(6)}`);
    console.log(`📈 Average Latency: ${((Date.now() - startTime) / 5 / 1000).toFixed(2)}s per query`);
    console.log('━'.repeat(80) + '\n');

  } catch (error: any) {
    console.error('\n❌ E2E TEST FAILED:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// ============================================
// ENTRY POINT
// ============================================

// Validate environment
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('❌ Error: ANTHROPIC_API_KEY not found in environment');
  console.error('💡 Create a .env file with: ANTHROPIC_API_KEY=sk-ant-...\n');
  process.exit(1);
}

// Note: Embeddings may still use OpenAI, so OPENAI_API_KEY might be needed
if (!process.env.OPENAI_API_KEY) {
  console.warn('⚠️  Warning: OPENAI_API_KEY not found. Embeddings may fail if OpenAI is used for embeddings.\n');
}

// Run all tests
runAllTests();

